import { beforeEach, describe, expect, it, vi } from 'vitest';

const { customerMock, transactionMock } = vi.hoisted(() => ({
  customerMock: {
    create: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
  },
  transactionMock: vi.fn(),
}));

vi.mock('../../config/database.js', () => ({
  prisma: {
    customer: customerMock,
    $transaction: transactionMock,
  },
}));

import {
  archiveCustomer,
  createCustomer,
  getCustomer,
  listCustomers,
  restoreCustomer,
  updateCustomer,
} from './customer.service.js';

describe('customer company isolation', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('always creates a customer inside the authenticated company', async () => {
    customerMock.create.mockResolvedValue({
      id: 'customer-a',
    });

    const input = {
      name: 'Secure Customer',
      companyId: 'company-b',
    } as Parameters<typeof createCustomer>[1];

    await createCustomer('company-a', input);

    expect(customerMock.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          companyId: 'company-a',
        }),
      }),
    );
  });

  it('limits customer lists to the authenticated company', async () => {
    transactionMock.mockResolvedValue([[], 0]);

    await listCustomers('company-a', {
      page: 1,
      limit: 20,
      search: '',
      status: 'active',
    });

    expect(customerMock.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          companyId: 'company-a',
        }),
      }),
    );

    expect(customerMock.count).toHaveBeenCalledWith({
      where: expect.objectContaining({
        companyId: 'company-a',
      }),
    });
  });

  it('searches for a customer using both customer and company IDs', async () => {
    customerMock.findFirst.mockResolvedValue({
      id: 'customer-a',
    });

    await getCustomer('company-a', 'customer-a');

    expect(customerMock.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 'customer-a',
          companyId: 'company-a',
        },
      }),
    );
  });

  it('returns 404 when accessing another company customer', async () => {
    customerMock.findFirst.mockResolvedValue(null);

    await expect(
      getCustomer('company-a', 'customer-b'),
    ).rejects.toMatchObject({
      statusCode: 404,
      message: 'Customer not found',
    });
  });

  it('prevents updating another company customer', async () => {
    customerMock.findFirst.mockResolvedValue(null);

    await expect(
      updateCustomer('company-a', 'customer-b', {
        name: 'Changed Customer',
      }),
    ).rejects.toMatchObject({
      statusCode: 404,
    });

    expect(customerMock.update).not.toHaveBeenCalled();
  });

  it('prevents archiving another company customer', async () => {
    customerMock.findFirst.mockResolvedValue(null);

    await expect(
      archiveCustomer('company-a', 'customer-b'),
    ).rejects.toMatchObject({
      statusCode: 404,
    });

    expect(customerMock.update).not.toHaveBeenCalled();
  });

  it('prevents restoring another company customer', async () => {
    customerMock.findFirst.mockResolvedValue(null);

    await expect(
      restoreCustomer('company-a', 'customer-b'),
    ).rejects.toMatchObject({
      statusCode: 404,
    });

    expect(customerMock.update).not.toHaveBeenCalled();
  });
});