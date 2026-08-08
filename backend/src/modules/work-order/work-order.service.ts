import { AppError } from '../../common/errors/app-error.js';
import { prisma } from '../../config/database.js';
import { Prisma } from '../../generated/prisma/client.js';
import type {
  CreateWorkOrderInput,
  UpdateWorkOrderInput,
  WorkOrderListQuery,
} from './work-order.schema.js';

const workOrderSelect = {
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
  notes: true,
  createdAt: true,
  updatedAt: true,

  customer: {
    select: {
      id: true,
      name: true,
      contactPerson: true,
      email: true,
      phone: true,
    },
  },

  assignments: {
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

    orderBy: {
      assignedAt: 'asc',
    },
  },
} satisfies Prisma.WorkOrderSelect;

const getCustomerForWorkOrder = async (
  transaction: Prisma.TransactionClient,
  companyId: string,
  customerId: string,
) => {
  const customer = await transaction.customer.findFirst({
    where: {
      id: customerId,
      companyId,
      isActive: true,
    },

    select: {
      id: true,
      addressLine: true,
      postalCode: true,
      city: true,
      countryCode: true,
    },
  });

  if (!customer) {
    throw new AppError(
      400,
      'The selected customer is invalid or archived',
    );
  }

  return customer;
};

const verifyEmployees = async (
  transaction: Prisma.TransactionClient,
  companyId: string,
  employeeIds: string[],
): Promise<void> => {
  if (employeeIds.length === 0) {
    return;
  }

  const employees = await transaction.employee.findMany({
    where: {
      id: {
        in: employeeIds,
      },
      companyId,
      isActive: true,
    },

    select: {
      id: true,
    },
  });

  if (employees.length !== employeeIds.length) {
    throw new AppError(
      400,
      'One or more selected employees are invalid or archived',
    );
  }
};

const generateWorkOrderReference = async (
  transaction: Prisma.TransactionClient,
  companyId: string,
): Promise<string> => {
  const year = new Date().getUTCFullYear();

  const sequence = await transaction.workOrderSequence.upsert({
    where: {
      companyId_year: {
        companyId,
        year,
      },
    },

    create: {
      companyId,
      year,
      lastNumber: 1,
    },

    update: {
      lastNumber: {
        increment: 1,
      },
    },

    select: {
      lastNumber: true,
    },
  });

  const formattedNumber = sequence.lastNumber
    .toString()
    .padStart(5, '0');

  return `WO-${year}-${formattedNumber}`;
};

export const createWorkOrder = async (
  companyId: string,
  input: CreateWorkOrderInput,
) => {
  if (
    input.status === 'PLANNED' &&
    (!input.scheduledStart || !input.scheduledEnd)
  ) {
    throw new AppError(
      400,
      'A planned work order requires a start and end time',
    );
  }

  return prisma.$transaction(async (transaction) => {
    const customer = await getCustomerForWorkOrder(
      transaction,
      companyId,
      input.customerId,
    );

    await verifyEmployees(
      transaction,
      companyId,
      input.employeeIds,
    );

    const reference = await generateWorkOrderReference(
      transaction,
      companyId,
    );

    const {
      employeeIds,
      ...workOrderData
    } = input;

    return transaction.workOrder.create({
      data: {
        ...workOrderData,
        companyId,
        reference,

        addressLine:
          workOrderData.addressLine ??
          customer.addressLine,

        postalCode:
          workOrderData.postalCode ??
          customer.postalCode,

        city:
          workOrderData.city ??
          customer.city,

        countryCode:
          workOrderData.countryCode ??
          customer.countryCode,

        ...(employeeIds.length > 0
          ? {
              assignments: {
                create: employeeIds.map((employeeId) => ({
                  employeeId,
                })),
              },
            }
          : {}),
      },

      select: workOrderSelect,
    });
  });
};

export const getWorkOrder = async (
  companyId: string,
  workOrderId: string,
) => {
  const workOrder = await prisma.workOrder.findFirst({
    where: {
      id: workOrderId,
      companyId,
    },

    select: workOrderSelect,
  });

  if (!workOrder) {
    throw new AppError(404, 'Work order not found');
  }

  return workOrder;
};

export const listWorkOrders = async (
  companyId: string,
  query: WorkOrderListQuery,
) => {
  const where: Prisma.WorkOrderWhereInput = {
    companyId,

    ...(query.status === 'ALL'
      ? {}
      : {
          status: query.status,
        }),

    ...(query.priority === 'ALL'
      ? {}
      : {
          priority: query.priority,
        }),

    ...(query.customerId
      ? {
          customerId: query.customerId,
        }
      : {}),

    ...(query.employeeId
      ? {
          assignments: {
            some: {
              employeeId: query.employeeId,
            },
          },
        }
      : {}),

    ...(query.dateFrom || query.dateTo
      ? {
          scheduledStart: {
            ...(query.dateFrom
              ? {
                  gte: query.dateFrom,
                }
              : {}),

            ...(query.dateTo
              ? {
                  lte: query.dateTo,
                }
              : {}),
          },
        }
      : {}),

    ...(query.search
      ? {
          OR: [
            {
              reference: {
                contains: query.search,
                mode: 'insensitive',
              },
            },
            {
              title: {
                contains: query.search,
                mode: 'insensitive',
              },
            },
            {
              description: {
                contains: query.search,
                mode: 'insensitive',
              },
            },
            {
              customer: {
                is: {
                  name: {
                    contains: query.search,
                    mode: 'insensitive',
                  },
                },
              },
            },
          ],
        }
      : {}),
  };

  const skip = (query.page - 1) * query.limit;

  const [workOrders, total] = await prisma.$transaction([
    prisma.workOrder.findMany({
      where,
      select: workOrderSelect,

      orderBy: [
        {
          createdAt: 'desc',
        },
      ],

      skip,
      take: query.limit,
    }),

    prisma.workOrder.count({
      where,
    }),
  ]);

  return {
    workOrders,

    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    },
  };
};

const allowedStatusTransitions: Record<
  string,
  readonly string[]
> = {
  DRAFT: [
    'PLANNED',
    'CANCELLED',
  ],

  PLANNED: [
    'DRAFT',
    'IN_PROGRESS',
    'CANCELLED',
  ],

  IN_PROGRESS: [
    'PLANNED',
    'COMPLETED',
    'CANCELLED',
  ],

  COMPLETED: [],

  CANCELLED: [
    'DRAFT',
  ],
};

const validateStatusTransition = (
  currentStatus: string,
  nextStatus: string,
): void => {
  if (currentStatus === nextStatus) {
    return;
  }

  const allowedStatuses =
    allowedStatusTransitions[currentStatus] ?? [];

  if (!allowedStatuses.includes(nextStatus)) {
    throw new AppError(
      400,
      `Status cannot change from ${currentStatus} to ${nextStatus}`,
    );
  }
};

export const updateWorkOrder = async (
  companyId: string,
  workOrderId: string,
  input: UpdateWorkOrderInput,
) => {
  return prisma.$transaction(async (transaction) => {
    const existingWorkOrder =
      await transaction.workOrder.findFirst({
        where: {
          id: workOrderId,
          companyId,
        },

        select: {
          id: true,
          customerId: true,
          status: true,
          scheduledStart: true,
          scheduledEnd: true,
        },
      });

    if (!existingWorkOrder) {
      throw new AppError(404, 'Work order not found');
    }

    const nextStatus =
      input.status ?? existingWorkOrder.status;

    validateStatusTransition(
      existingWorkOrder.status,
      nextStatus,
    );

    const nextScheduledStart =
      input.scheduledStart === undefined
        ? existingWorkOrder.scheduledStart
        : input.scheduledStart;

    const nextScheduledEnd =
      input.scheduledEnd === undefined
        ? existingWorkOrder.scheduledEnd
        : input.scheduledEnd;

    if (
      nextScheduledStart &&
      nextScheduledEnd &&
      nextScheduledEnd <= nextScheduledStart
    ) {
      throw new AppError(
        400,
        'Scheduled end must be after scheduled start',
      );
    }

    if (
      (
        nextStatus === 'PLANNED' ||
        nextStatus === 'IN_PROGRESS' ||
        nextStatus === 'COMPLETED'
      ) &&
      (!nextScheduledStart || !nextScheduledEnd)
    ) {
      throw new AppError(
        400,
        `${nextStatus} work orders require a start and end time`,
      );
    }

    let newCustomer:
      | Awaited<ReturnType<typeof getCustomerForWorkOrder>>
      | null = null;

    if (
      input.customerId &&
      input.customerId !== existingWorkOrder.customerId
    ) {
      newCustomer = await getCustomerForWorkOrder(
        transaction,
        companyId,
        input.customerId,
      );
    }

    if (input.employeeIds !== undefined) {
      await verifyEmployees(
        transaction,
        companyId,
        input.employeeIds,
      );
    }

    const {
      employeeIds,
      ...workOrderData
    } = input;

    const updateData: Prisma.WorkOrderUncheckedUpdateInput = {
      ...workOrderData,
    };

    if (newCustomer) {
      updateData.addressLine =
        workOrderData.addressLine === undefined
          ? newCustomer.addressLine
          : workOrderData.addressLine;

      updateData.postalCode =
        workOrderData.postalCode === undefined
          ? newCustomer.postalCode
          : workOrderData.postalCode;

      updateData.city =
        workOrderData.city === undefined
          ? newCustomer.city
          : workOrderData.city;

      updateData.countryCode =
        workOrderData.countryCode ??
        newCustomer.countryCode;
    }

    await transaction.workOrder.update({
      where: {
        id: workOrderId,
      },

      data: updateData,
    });

    if (employeeIds !== undefined) {
      await transaction.workOrderAssignment.deleteMany({
        where: {
          workOrderId,
        },
      });

      if (employeeIds.length > 0) {
        await transaction.workOrderAssignment.createMany({
          data: employeeIds.map((employeeId) => ({
            workOrderId,
            employeeId,
          })),
        });
      }
    }

    return transaction.workOrder.findUniqueOrThrow({
      where: {
        id: workOrderId,
      },

      select: workOrderSelect,
    });
  });
};