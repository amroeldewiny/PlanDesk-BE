import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prismaMock, transactionMock } = vi.hoisted(() => {
  const transaction = {
    customer: {
      findFirst: vi.fn(),
    },
    employee: {
      findMany: vi.fn(),
    },
    workOrderSequence: {
      upsert: vi.fn(),
    },
    workOrder: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      findUniqueOrThrow: vi.fn(),
    },
    workOrderAssignment: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
  };

  const prisma = {
    workOrder: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
    $transaction: vi.fn(),
  };

  return {
    prismaMock: prisma,
    transactionMock: transaction,
  };
});

vi.mock('../../config/database.js', () => ({
  prisma: prismaMock,
}));

import {
  createWorkOrder,
  getWorkOrder,
  listWorkOrders,
  updateWorkOrder,
} from './work-order.service.js';

const createInput = (
  overrides: Record<string, unknown> = {},
): Parameters<typeof createWorkOrder>[1] =>
  ({
    customerId: 'customer-a',
    title: 'Clean office',
    status: 'DRAFT',
    priority: 'NORMAL',
    employeeIds: [],
    countryCode: 'BE',
    ...overrides,
  }) as Parameters<typeof createWorkOrder>[1];

const existingWorkOrder = {
  id: 'work-order-a',
  customerId: 'customer-a',
  status: 'DRAFT',
  scheduledStart: null,
  scheduledEnd: null,
};

const activeCustomer = {
  id: 'customer-a',
  addressLine: 'Main Street 10',
  postalCode: '1000',
  city: 'Brussels',
  countryCode: 'BE',
};

describe('work order company isolation', () => {
  beforeEach(() => {
    vi.resetAllMocks();

    prismaMock.$transaction.mockImplementation(
      async (operation: unknown) => {
        if (typeof operation === 'function') {
          return operation(transactionMock);
        }

        return Promise.all(
          operation as Promise<unknown>[],
        );
      },
    );
  });

  it('limits work order lists to the authenticated company', async () => {
    prismaMock.workOrder.findMany.mockResolvedValue([]);
    prismaMock.workOrder.count.mockResolvedValue(0);

    await listWorkOrders(
      'company-a',
      {
        page: 1,
        limit: 20,
        search: '',
        status: 'ALL',
        priority: 'ALL',
      } as Parameters<typeof listWorkOrders>[1],
    );

    expect(
      prismaMock.workOrder.findMany,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          companyId: 'company-a',
        }),
      }),
    );

    expect(
      prismaMock.workOrder.count,
    ).toHaveBeenCalledWith({
      where: expect.objectContaining({
        companyId: 'company-a',
      }),
    });
  });

  it('searches using both work order and company IDs', async () => {
    prismaMock.workOrder.findFirst.mockResolvedValue({
      id: 'work-order-a',
    });

    await getWorkOrder(
      'company-a',
      'work-order-a',
    );

    expect(
      prismaMock.workOrder.findFirst,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 'work-order-a',
          companyId: 'company-a',
        },
      }),
    );
  });

  it('returns 404 for another company work order', async () => {
    prismaMock.workOrder.findFirst.mockResolvedValue(null);

    await expect(
      getWorkOrder(
        'company-a',
        'work-order-b',
      ),
    ).rejects.toMatchObject({
      statusCode: 404,
      message: 'Work order not found',
    });
  });

  it('prevents updating another company work order', async () => {
    transactionMock.workOrder.findFirst.mockResolvedValue(
      null,
    );

    await expect(
      updateWorkOrder(
        'company-a',
        'work-order-b',
        {
          title: 'Changed title',
        },
      ),
    ).rejects.toMatchObject({
      statusCode: 404,
      message: 'Work order not found',
    });

    expect(
      transactionMock.workOrder.update,
    ).not.toHaveBeenCalled();
  });

  it('prevents creating a work order for another company customer', async () => {
    transactionMock.customer.findFirst.mockResolvedValue(
      null,
    );

    await expect(
      createWorkOrder(
        'company-a',
        createInput({
          customerId: 'customer-b',
        }),
      ),
    ).rejects.toMatchObject({
      statusCode: 400,
      message:
        'The selected customer is invalid or archived',
    });

    expect(
      transactionMock.customer.findFirst,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 'customer-b',
          companyId: 'company-a',
          isActive: true,
        },
      }),
    );

    expect(
      transactionMock.workOrder.create,
    ).not.toHaveBeenCalled();
  });

  it('prevents assigning another company employee during creation', async () => {
    transactionMock.customer.findFirst.mockResolvedValue(
      activeCustomer,
    );

    transactionMock.employee.findMany.mockResolvedValue(
      [],
    );

    await expect(
      createWorkOrder(
        'company-a',
        createInput({
          employeeIds: ['employee-b'],
        }),
      ),
    ).rejects.toMatchObject({
      statusCode: 400,
      message:
        'One or more selected employees are invalid or archived',
    });

    expect(
      transactionMock.employee.findMany,
    ).toHaveBeenCalledWith({
      where: {
        id: {
          in: ['employee-b'],
        },
        companyId: 'company-a',
        isActive: true,
      },
      select: {
        id: true,
      },
    });

    expect(
      transactionMock.workOrder.create,
    ).not.toHaveBeenCalled();
  });

  it('always creates the work order and sequence inside the authenticated company', async () => {
    transactionMock.customer.findFirst.mockResolvedValue(
      activeCustomer,
    );

    transactionMock.workOrderSequence.upsert.mockResolvedValue({
      lastNumber: 1,
    });

    transactionMock.workOrder.create.mockResolvedValue({
      id: 'work-order-a',
    });

    await createWorkOrder(
      'company-a',
      createInput({
        companyId: 'company-b',
      }),
    );

    expect(
      transactionMock.workOrderSequence.upsert,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          companyId_year: {
            companyId: 'company-a',
            year: expect.any(Number),
          },
        },
        create: expect.objectContaining({
          companyId: 'company-a',
        }),
      }),
    );

    expect(
      transactionMock.workOrder.create,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          companyId: 'company-a',
          reference: expect.stringMatching(
            /^WO-\d{4}-00001$/,
          ),
        }),
      }),
    );
  });

  it('prevents changing to another company customer', async () => {
    transactionMock.workOrder.findFirst.mockResolvedValue(
      existingWorkOrder,
    );

    transactionMock.customer.findFirst.mockResolvedValue(
      null,
    );

    await expect(
      updateWorkOrder(
        'company-a',
        'work-order-a',
        {
          customerId: 'customer-b',
        },
      ),
    ).rejects.toMatchObject({
      statusCode: 400,
      message:
        'The selected customer is invalid or archived',
    });

    expect(
      transactionMock.customer.findFirst,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 'customer-b',
          companyId: 'company-a',
          isActive: true,
        },
      }),
    );

    expect(
      transactionMock.workOrder.update,
    ).not.toHaveBeenCalled();
  });

  it('prevents assigning another company employee during update', async () => {
    transactionMock.workOrder.findFirst.mockResolvedValue(
      existingWorkOrder,
    );

    transactionMock.employee.findMany.mockResolvedValue(
      [],
    );

    await expect(
      updateWorkOrder(
        'company-a',
        'work-order-a',
        {
          employeeIds: ['employee-b'],
        },
      ),
    ).rejects.toMatchObject({
      statusCode: 400,
      message:
        'One or more selected employees are invalid or archived',
    });

    expect(
      transactionMock.workOrder.update,
    ).not.toHaveBeenCalled();

    expect(
      transactionMock.workOrderAssignment.deleteMany,
    ).not.toHaveBeenCalled();
  });
});

describe('work order status workflow', () => {
  beforeEach(() => {
    vi.resetAllMocks();

    prismaMock.$transaction.mockImplementation(
      async (operation: unknown) => {
        if (typeof operation === 'function') {
          return operation(transactionMock);
        }

        return Promise.all(
          operation as Promise<unknown>[],
        );
      },
    );
  });

  it('prevents an invalid DRAFT to COMPLETED transition', async () => {
    transactionMock.workOrder.findFirst.mockResolvedValue({
      ...existingWorkOrder,
      status: 'DRAFT',
    });

    await expect(
      updateWorkOrder(
        'company-a',
        'work-order-a',
        {
          status: 'COMPLETED',
        },
      ),
    ).rejects.toMatchObject({
      statusCode: 400,
      message:
        'Status cannot change from DRAFT to COMPLETED',
    });

    expect(
      transactionMock.workOrder.update,
    ).not.toHaveBeenCalled();
  });

  it('requires start and end times when planning a work order', async () => {
    transactionMock.workOrder.findFirst.mockResolvedValue({
      ...existingWorkOrder,
      status: 'DRAFT',
    });

    await expect(
      updateWorkOrder(
        'company-a',
        'work-order-a',
        {
          status: 'PLANNED',
        },
      ),
    ).rejects.toMatchObject({
      statusCode: 400,
      message:
        'PLANNED work orders require a start and end time',
    });

    expect(
      transactionMock.workOrder.update,
    ).not.toHaveBeenCalled();
  });

  it('prevents the end time from being before the start time', async () => {
    transactionMock.workOrder.findFirst.mockResolvedValue({
      ...existingWorkOrder,
      status: 'DRAFT',
    });

    await expect(
      updateWorkOrder(
        'company-a',
        'work-order-a',
        {
          scheduledStart: new Date(
            '2026-08-11T12:00:00.000Z',
          ),
          scheduledEnd: new Date(
            '2026-08-11T10:00:00.000Z',
          ),
        },
      ),
    ).rejects.toMatchObject({
      statusCode: 400,
      message:
        'Scheduled end must be after scheduled start',
    });

    expect(
      transactionMock.workOrder.update,
    ).not.toHaveBeenCalled();
  });

  it('allows a valid DRAFT to PLANNED transition', async () => {
    const scheduledStart = new Date(
      '2026-08-11T10:00:00.000Z',
    );

    const scheduledEnd = new Date(
      '2026-08-11T12:00:00.000Z',
    );

    transactionMock.workOrder.findFirst.mockResolvedValue({
      ...existingWorkOrder,
      status: 'DRAFT',
    });

    transactionMock.workOrder.update.mockResolvedValue({
      id: 'work-order-a',
    });

    transactionMock.workOrder.findUniqueOrThrow.mockResolvedValue({
      id: 'work-order-a',
      status: 'PLANNED',
    });

    await updateWorkOrder(
      'company-a',
      'work-order-a',
      {
        status: 'PLANNED',
        scheduledStart,
        scheduledEnd,
      },
    );

    expect(
      transactionMock.workOrder.update,
    ).toHaveBeenCalledWith({
      where: {
        id: 'work-order-a',
      },
      data: expect.objectContaining({
        status: 'PLANNED',
        scheduledStart,
        scheduledEnd,
      }),
    });
  });
});