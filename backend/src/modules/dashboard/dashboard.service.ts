import { prisma } from '../../config/database.js';

export async function getDashboardSummary(companyId: string) {
  const now = new Date();
  const nextSevenDays = new Date(now);

  nextSevenDays.setDate(nextSevenDays.getDate() + 7);

  /**
   * These independent queries run concurrently to keep the dashboard
   * response fast while maintaining company isolation.
   */
  const [
    activeCustomers,
    activeEmployees,
    statusCounts,
    unscheduledWorkOrders,
    upcomingWorkOrders,
    overdueWorkOrders,
    recentWorkOrders,
  ] = await Promise.all([
    prisma.customer.count({
      where: {
        companyId,
        isActive: true,
      },
    }),

    prisma.employee.count({
      where: {
        companyId,
        isActive: true,
      },
    }),

    prisma.workOrder.groupBy({
      by: ['status'],
      where: {
        companyId,
      },
      _count: {
        _all: true,
      },
    }),

    prisma.workOrder.count({
      where: {
        companyId,
        status: 'DRAFT',
        OR: [
          {
            scheduledStart: null,
          },
          {
            scheduledEnd: null,
          },
        ],
      },
    }),

    prisma.workOrder.count({
      where: {
        companyId,
        status: {
          in: ['PLANNED', 'IN_PROGRESS'],
        },
        scheduledStart: {
          gte: now,
          lt: nextSevenDays,
        },
      },
    }),

    prisma.workOrder.count({
      where: {
        companyId,
        status: {
          in: ['PLANNED', 'IN_PROGRESS'],
        },
        scheduledEnd: {
          lt: now,
        },
      },
    }),

    prisma.workOrder.findMany({
      where: {
        companyId,
      },
      select: {
        id: true,
        reference: true,
        title: true,
        status: true,
        priority: true,
        scheduledStart: true,
        createdAt: true,
        customer: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            assignments: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 5,
    }),
  ]);

  const countByStatus = Object.fromEntries(
    statusCounts.map((item) => [
      item.status,
      item._count._all,
    ]),
  );

  const draft = countByStatus['DRAFT'] ?? 0;
  const planned = countByStatus['PLANNED'] ?? 0;
  const inProgress = countByStatus['IN_PROGRESS'] ?? 0;
  const completed = countByStatus['COMPLETED'] ?? 0;
  const cancelled = countByStatus['CANCELLED'] ?? 0;

  return {
    customers: {
      active: activeCustomers,
    },
    employees: {
      active: activeEmployees,
    },
    workOrders: {
      total:
        draft +
        planned +
        inProgress +
        completed +
        cancelled,
      active: draft + planned + inProgress,
      draft,
      planned,
      inProgress,
      completed,
      cancelled,
      unscheduled: unscheduledWorkOrders,
      upcomingSevenDays: upcomingWorkOrders,
      overdue: overdueWorkOrders,
    },
    recentWorkOrders: recentWorkOrders.map((workOrder) => ({
      id: workOrder.id,
      reference: workOrder.reference,
      title: workOrder.title,
      status: workOrder.status,
      priority: workOrder.priority,
      scheduledStart: workOrder.scheduledStart,
      createdAt: workOrder.createdAt,
      customer: workOrder.customer,
      assignedEmployeeCount: workOrder._count.assignments,
    })),
    generatedAt: now,
  };
}