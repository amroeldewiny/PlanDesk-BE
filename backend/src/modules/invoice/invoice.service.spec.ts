import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import { Prisma } from '../../generated/prisma/client.js';

const {
  prismaMock,
  transactionMock,
} = vi.hoisted(() => {
  const transaction = {
    company: {
      findFirst: vi.fn(),
    },

    customer: {
      findFirst: vi.fn(),
    },

    workOrder: {
      findMany: vi.fn(),
    },

    invoice: {
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      findUniqueOrThrow: vi.fn(),
    },

    invoiceItem: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },

    invoiceWorkOrder: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },

    invoiceSequence: {
      upsert: vi.fn(),
    },
  };

  return {
    transactionMock: transaction,

    prismaMock: {
      $transaction: vi.fn(),
    },
  };
});

vi.mock('../../config/database.js', () => ({
  prisma: prismaMock,
}));

import {
  createInvoice,
  issueInvoice,
  updateInvoice,
} from './invoice.service.js';

import {
  createInvoiceSchema,
  issueInvoiceSchema,
  updateInvoiceSchema,
} from './invoice.schema.js';

const COMPANY_ID =
  '11111111-1111-4111-8111-111111111111';

const CUSTOMER_ID =
  '22222222-2222-4222-8222-222222222222';

const INVOICE_ID =
  '33333333-3333-4333-8333-333333333333';

const WORK_ORDER_ID =
  '44444444-4444-4444-8444-444444444444';

const company = {
  id: COMPANY_ID,
  name: 'PlanDesk Cleaning BV',
  vatNumber: 'BE0123456789',
  email: 'info@plandesk.be',
  phone: '+32 89 12 34 56',
  addressLine: 'Rijksweg 100',
  postalCode: '3630',
  city: 'Maasmechelen',
  countryCode: 'BE',

  iban: 'BE68539007547034',
  bic: 'KREDBEBB',

  invoicePrefix: 'INV',
  defaultPaymentTermDays: 30,
  defaultVatRate: new Prisma.Decimal('21.00'),
};

const customer = {
  id: CUSTOMER_ID,
  name: 'Hotel Maasland',
  vatNumber: 'BE0987654321',
  email: 'info@hotelmaasland.be',
  phone: '+32 89 98 76 54',
  addressLine: 'Hotelstraat 10',
  postalCode: '3630',
  city: 'Maasmechelen',
  countryCode: 'BE',
};

const createValidInvoiceInput = (
  workOrderIds: string[] = [],
) =>
  createInvoiceSchema.parse({
    customerId: CUSTOMER_ID,
    workOrderIds,

    items: [
      {
        description: 'Weekly office cleaning',
        quantity: 2,
        unitPriceExclVat: 50,
        vatRate: 21,
      },
    ],
  });

describe('invoice service', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    prismaMock.$transaction.mockImplementation(
      async (
        callback: (
          transaction: typeof transactionMock,
        ) => unknown,
      ) => callback(transactionMock),
    );
  });

  it('creates a company-scoped draft with calculated totals', async () => {
    transactionMock.company.findFirst.mockResolvedValue(
      company,
    );

    transactionMock.customer.findFirst.mockResolvedValue(
      customer,
    );

    transactionMock.invoice.create.mockResolvedValue({
      id: INVOICE_ID,
      status: 'DRAFT',
    });

    const result = await createInvoice(
      COMPANY_ID,
      createValidInvoiceInput(),
    );

    expect(
      transactionMock.company.findFirst,
    ).toHaveBeenCalledWith({
      where: {
        id: COMPANY_ID,
        isActive: true,
      },
      select: expect.any(Object),
    });

    expect(
      transactionMock.customer.findFirst,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: CUSTOMER_ID,
          companyId: COMPANY_ID,
          isActive: true,
        },
      }),
    );

    const createCall =
      transactionMock.invoice.create.mock.calls[0][0];

    expect(createCall.data.companyId).toBe(COMPANY_ID);
    expect(createCall.data.customerId).toBe(CUSTOMER_ID);
    expect(createCall.data.sellerName).toBe(
      'PlanDesk Cleaning BV',
    );
    expect(createCall.data.buyerName).toBe(
      'Hotel Maasland',
    );

    expect(
      createCall.data.subtotalExclVat.toFixed(2),
    ).toBe('100.00');

    expect(createCall.data.vatTotal.toFixed(2)).toBe(
      '21.00',
    );

    expect(
      createCall.data.totalInclVat.toFixed(2),
    ).toBe('121.00');

    expect(result).toEqual({
      id: INVOICE_ID,
      status: 'DRAFT',
    });
  });

  it('rejects invalid or already invoiced work orders', async () => {
    transactionMock.company.findFirst.mockResolvedValue(
      company,
    );

    transactionMock.customer.findFirst.mockResolvedValue(
      customer,
    );

    /*
     * No matching work orders means the requested work order
     * belongs to another company/customer, is not completed,
     * or was already invoiced.
     */
    transactionMock.workOrder.findMany.mockResolvedValue(
      [],
    );

    await expect(
      createInvoice(
        COMPANY_ID,
        createValidInvoiceInput([WORK_ORDER_ID]),
      ),
    ).rejects.toMatchObject({
      statusCode: 400,
    });

    expect(
      transactionMock.invoice.create,
    ).not.toHaveBeenCalled();
  });

  it('does not allow issued invoices to be edited', async () => {
    transactionMock.invoice.findFirst.mockResolvedValue({
      id: INVOICE_ID,
      status: 'ISSUED',
      customerId: CUSTOMER_ID,

      issueDate: new Date('2026-08-16T00:00:00.000Z'),
      dueDate: new Date('2026-09-15T00:00:00.000Z'),

      servicePeriodStart: null,
      servicePeriodEnd: null,

      workOrders: [],
    });

    const input = updateInvoiceSchema.parse({
      notes: 'This edit must be rejected',
    });

    await expect(
      updateInvoice(
        COMPANY_ID,
        INVOICE_ID,
        input,
      ),
    ).rejects.toMatchObject({
      statusCode: 409,
      message: 'Only draft invoices can be edited',
    });

    expect(
      transactionMock.invoice.update,
    ).not.toHaveBeenCalled();
  });

  it('allocates a sequential number when issuing', async () => {
    transactionMock.invoice.findFirst.mockResolvedValue({
      id: INVOICE_ID,
      status: 'DRAFT',
      customerId: CUSTOMER_ID,
      issueDate: null,
      dueDate: null,

      items: [
        {
          id: 'invoice-item-1',
        },
      ],
    });

    transactionMock.company.findFirst.mockResolvedValue(
      company,
    );

    transactionMock.customer.findFirst.mockResolvedValue(
      customer,
    );

    transactionMock.invoiceSequence.upsert.mockResolvedValue(
      {
        lastNumber: 7,
      },
    );

    transactionMock.invoice.updateMany.mockResolvedValue({
      count: 1,
    });

    transactionMock.invoice.findUniqueOrThrow.mockResolvedValue(
      {
        id: INVOICE_ID,
        number: 'INV-2026-00007',
        status: 'ISSUED',
      },
    );

    const input = issueInvoiceSchema.parse({
      issueDate: '2026-08-16T00:00:00.000Z',
      dueDate: '2026-09-15T00:00:00.000Z',
    });

    const result = await issueInvoice(
      COMPANY_ID,
      INVOICE_ID,
      input,
    );

    expect(
      transactionMock.invoiceSequence.upsert,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          companyId_year: {
            companyId: COMPANY_ID,
            year: 2026,
          },
        },
      }),
    );

    expect(
      transactionMock.invoice.updateMany,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: INVOICE_ID,
          companyId: COMPANY_ID,
          status: 'DRAFT',
        },

        data: expect.objectContaining({
          number: 'INV-2026-00007',
          status: 'ISSUED',
        }),
      }),
    );

    expect(result).toEqual({
      id: INVOICE_ID,
      number: 'INV-2026-00007',
      status: 'ISSUED',
    });
  });
});