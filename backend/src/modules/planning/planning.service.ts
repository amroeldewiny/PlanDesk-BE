import { prisma } from '../../config/database.js';
import { Prisma } from '../../generated/prisma/client.js';
import { type PlanningQuery } from './planning.schema.js';

const planningWorkOrderSelect = {
  id: true,
  reference: true,
  title: true,
  description: true,
  status: true,
  priority: true,
  scheduledStart: true,
  scheduledEnd: true,
  addressLine: true,
  postalCode: true,
  city: true,
  countryCode: true,

  customer: {
    select: {
      id: true,
      name: true,
      contactPerson: true,
      phone: true,
    },
  },

  assignments: {
    orderBy: {
      assignedAt: 'asc',
    },
    select: {
      assignedAt: true,
      employee: {
        select: {
          id: true,
          employeeNumber: true,
          firstName: true,
          lastName: true,
          jobTitle: true,
        },
      },
    },
  },
} satisfies Prisma.WorkOrderSelect;

/**
 * Builds filters shared by scheduled and unscheduled Work Orders.
 * companyId always comes from the authenticated request context.
 */
function buildCommonWhere(
  companyId: string,
  query: PlanningQuery,
): Prisma.WorkOrderWhereInput {
  return {
    companyId,

    ...(query.status !== 'ALL' && {
      status: query.status,
    }),

    ...(query.customerId && {
      customerId: query.customerId,
    }),

    ...(query.employeeId && {
      assignments: {
        some: {
          employeeId: query.employeeId,
        },
      },
    }),
  };
}

export async function getPlanning(
  companyId: string,
  query: PlanningQuery,
) {
  const commonWhere = buildCommonWhere(companyId, query);

  /**
   * An order overlaps the requested range when:
   *
   * order start < range end
   * AND
   * order end > range start
   *
   * This also includes work that begins before the selected week but
   * continues into it.
   */
  const scheduledWhere: Prisma.WorkOrderWhereInput = {
    ...commonWhere,
    scheduledStart: {
      not: null,
      lt: query.to,
    },
    scheduledEnd: {
      not: null,
      gt: query.from,
    },
  };

  const scheduledRequest = prisma.workOrder.findMany({
    where: scheduledWhere,
    select: planningWorkOrderSelect,
    orderBy: [
      {
        scheduledStart: 'asc',
      },
      {
        priority: 'desc',
      },
      {
        reference: 'asc',
      },
    ],
  });

  if (!query.includeUnscheduled) {
    const scheduledWorkOrders = await scheduledRequest;

    return {
      range: {
        from: query.from,
        to: query.to,
      },
      scheduledWorkOrders,
      unscheduledWorkOrders: [],
      totals: {
        scheduled: scheduledWorkOrders.length,
        unscheduled: 0,
      },
    };
  }

  /**
   * A Work Order is unscheduled when either side of its schedule
   * is missing. The list is limited because it appears in a sidebar.
   */
  const unscheduledWhere: Prisma.WorkOrderWhereInput = {
    ...commonWhere,
    OR: [
      {
        scheduledStart: null,
      },
      {
        scheduledEnd: null,
      },
    ],
  };

  const [
    scheduledWorkOrders,
    unscheduledWorkOrders,
    unscheduledTotal,
  ] = await Promise.all([
    scheduledRequest,
    prisma.workOrder.findMany({
      where: unscheduledWhere,
      select: planningWorkOrderSelect,
      orderBy: [
        {
          priority: 'desc',
        },
        {
          createdAt: 'desc',
        },
      ],
      take: 50,
    }),
    prisma.workOrder.count({
      where: unscheduledWhere,
    }),
  ]);

  return {
    range: {
      from: query.from,
      to: query.to,
    },
    scheduledWorkOrders,
    unscheduledWorkOrders,
    totals: {
      scheduled: scheduledWorkOrders.length,
      unscheduled: unscheduledTotal,
    },
  };
}