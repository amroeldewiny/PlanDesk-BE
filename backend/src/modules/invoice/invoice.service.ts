import { AppError } from '../../common/errors/app-error.js';
import { prisma } from '../../config/database.js';
import { Prisma } from '../../generated/prisma/client.js';

import { calculateInvoice } from './invoice.calculator.js';
import type {
  CreateInvoiceInput,
  InvoiceListQuery,
  IssueInvoiceInput,
  MarkInvoicePaidInput,
  UpdateInvoiceInput,
} from './invoice.schema.js';

const invoiceSelect = {
  id: true,
  number: true,
  status: true,

  issueDate: true,
  dueDate: true,
  servicePeriodStart: true,
  servicePeriodEnd: true,

  currencyCode: true,
  languageCode: true,

  customerReference: true,
  paymentReference: true,
  paymentTerms: true,
  notes: true,

  sellerName: true,
  sellerVatNumber: true,
  sellerEmail: true,
  sellerPhone: true,
  sellerAddressLine: true,
  sellerPostalCode: true,
  sellerCity: true,
  sellerCountryCode: true,
  sellerIban: true,
  sellerBic: true,

  buyerName: true,
  buyerVatNumber: true,
  buyerEmail: true,
  buyerPhone: true,
  buyerAddressLine: true,
  buyerPostalCode: true,
  buyerCity: true,
  buyerCountryCode: true,

  subtotalExclVat: true,
  vatTotal: true,
  totalInclVat: true,

  sentAt: true,
  paidAt: true,
  createdAt: true,
  updatedAt: true,

  customer: {
    select: {
      id: true,
      name: true,
      isActive: true,
    },
  },

  items: {
    select: {
      id: true,
      position: true,
      description: true,
      unitCode: true,
      quantity: true,
      unitPriceExclVat: true,
      discountPercentage: true,
      lineSubtotalExclVat: true,
      vatRate: true,
      vatAmount: true,
      lineTotalInclVat: true,
    },
    orderBy: {
      position: 'asc',
    },
  },

  workOrders: {
    select: {
      linkedAt: true,

      workOrder: {
        select: {
          id: true,
          reference: true,
          title: true,
          status: true,
          scheduledStart: true,
          scheduledEnd: true,
        },
      },
    },
    orderBy: {
      linkedAt: 'asc',
    },
  },
} satisfies Prisma.InvoiceSelect;

const invoiceListSelect = {
  id: true,
  number: true,
  status: true,

  issueDate: true,
  dueDate: true,

  currencyCode: true,

  subtotalExclVat: true,
  vatTotal: true,
  totalInclVat: true,

  sentAt: true,
  paidAt: true,
  createdAt: true,
  updatedAt: true,

  buyerName: true,
  buyerVatNumber: true,

  customer: {
    select: {
      id: true,
      name: true,
      isActive: true,
    },
  },

  _count: {
    select: {
      items: true,
      workOrders: true,
    },
  },
} satisfies Prisma.InvoiceSelect;

/**
 * Determines overdue state dynamically so it cannot become stale
 * inside the database.
 */
const isInvoiceOverdue = (
  invoice: {
    status: string;
    dueDate: Date | null;
  },
  now = new Date(),
): boolean => {
  return (
    (invoice.status === 'ISSUED' ||
      invoice.status === 'SENT') &&
    Boolean(invoice.dueDate && invoice.dueDate < now)
  );
};

const getCompanyForInvoice = async (
  transaction: Prisma.TransactionClient,
  companyId: string,
) => {
  const company = await transaction.company.findFirst({
    where: {
      id: companyId,
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      vatNumber: true,
      email: true,
      phone: true,
      addressLine: true,
      postalCode: true,
      city: true,
      countryCode: true,

      iban: true,
      bic: true,
      invoicePrefix: true,
      defaultPaymentTermDays: true,
      defaultVatRate: true,
    },
  });

  if (!company) {
    throw new AppError(
      403,
      'Company access is no longer active',
    );
  }

  return company;
};

const getCustomerForInvoice = async (
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
      name: true,
      vatNumber: true,
      email: true,
      phone: true,
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

const createSellerSnapshot = (
  company: Awaited<
    ReturnType<typeof getCompanyForInvoice>
  >,
) => ({
  sellerName: company.name,
  sellerVatNumber: company.vatNumber,
  sellerEmail: company.email,
  sellerPhone: company.phone,
  sellerAddressLine: company.addressLine,
  sellerPostalCode: company.postalCode,
  sellerCity: company.city,
  sellerCountryCode: company.countryCode,
  sellerIban: company.iban,
  sellerBic: company.bic,
});

const createBuyerSnapshot = (
  customer: Awaited<
    ReturnType<typeof getCustomerForInvoice>
  >,
) => ({
  buyerName: customer.name,
  buyerVatNumber: customer.vatNumber,
  buyerEmail: customer.email,
  buyerPhone: customer.phone,
  buyerAddressLine: customer.addressLine,
  buyerPostalCode: customer.postalCode,
  buyerCity: customer.city,
  buyerCountryCode: customer.countryCode,
});

/**
 * Only completed work orders belonging to the selected customer and
 * company can be invoiced.
 */
const verifyWorkOrders = async (
  transaction: Prisma.TransactionClient,
  companyId: string,
  customerId: string,
  workOrderIds: string[],
  currentInvoiceId?: string,
): Promise<void> => {
  if (workOrderIds.length === 0) {
    return;
  }

  const workOrders = await transaction.workOrder.findMany({
    where: {
      id: {
        in: workOrderIds,
      },
      companyId,
      customerId,
      status: 'COMPLETED',

      invoiceLinks: currentInvoiceId
        ? {
            none: {
              invoiceId: {
                not: currentInvoiceId,
              },
            },
          }
        : {
            none: {},
          },
    },
    select: {
      id: true,
    },
  });

  if (workOrders.length !== workOrderIds.length) {
    throw new AppError(
      400,
      'Every work order must be completed, belong to the selected customer and not already be invoiced',
    );
  }
};

const handleInvoiceConflict = (
  error: unknown,
): never => {
  if (
    error instanceof
      Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  ) {
    throw new AppError(
      409,
      'An invoice number or work order is already in use',
    );
  }

  throw error;
};

export const createInvoice = async (
  companyId: string,
  input: CreateInvoiceInput,
) => {
  try {
    return await prisma.$transaction(
      async (transaction) => {
        const company = await getCompanyForInvoice(
          transaction,
          companyId,
        );

        const customer = await getCustomerForInvoice(
          transaction,
          companyId,
          input.customerId,
        );

        await verifyWorkOrders(
          transaction,
          companyId,
          customer.id,
          input.workOrderIds,
        );

        const calculatedInvoice = calculateInvoice(
          input.items,
        );

        const {
          customerId,
          workOrderIds,
          items: _items,
          ...draftData
        } = input;

        return transaction.invoice.create({
          data: {
            ...draftData,

            companyId,
            customerId,

            ...createSellerSnapshot(company),
            ...createBuyerSnapshot(customer),

            subtotalExclVat:
              calculatedInvoice.subtotalExclVat,

            vatTotal: calculatedInvoice.vatTotal,

            totalInclVat:
              calculatedInvoice.totalInclVat,

            items: {
              create: calculatedInvoice.items,
            },

            ...(workOrderIds.length > 0
              ? {
                  workOrders: {
                    create: workOrderIds.map(
                      (workOrderId) => ({
                        workOrderId,
                      }),
                    ),
                  },
                }
              : {}),
          },

          select: invoiceSelect,
        });
      },
    );
  } catch (error) {
    return handleInvoiceConflict(error);
  }
};

export const getInvoice = async (
  companyId: string,
  invoiceId: string,
) => {
  const invoice = await prisma.invoice.findFirst({
    where: {
      id: invoiceId,
      companyId,
    },
    select: invoiceSelect,
  });

  if (!invoice) {
    throw new AppError(404, 'Invoice not found');
  }

  return {
    ...invoice,
    isOverdue: isInvoiceOverdue(invoice),
  };
};

export const listInvoices = async (
  companyId: string,
  query: InvoiceListQuery,
) => {
  const conditions: Prisma.InvoiceWhereInput[] = [
    {
      companyId,
    },
  ];

  if (query.status !== 'ALL') {
    conditions.push({
      status: query.status,
    });
  }

  if (query.customerId) {
    conditions.push({
      customerId: query.customerId,
    });
  }

  if (query.search) {
    conditions.push({
      OR: [
        {
          number: {
            contains: query.search,
            mode: 'insensitive',
          },
        },
        {
          buyerName: {
            contains: query.search,
            mode: 'insensitive',
          },
        },
        {
          buyerVatNumber: {
            contains: query.search,
            mode: 'insensitive',
          },
        },
        {
          customerReference: {
            contains: query.search,
            mode: 'insensitive',
          },
        },
      ],
    });
  }

  if (query.dateFrom || query.dateTo) {
    conditions.push({
      issueDate: {
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
    });
  }

  if (query.overdue === 'true') {
    conditions.push({
      status: {
        in: ['ISSUED', 'SENT'],
      },
      dueDate: {
        lt: new Date(),
      },
    });
  }

  if (query.overdue === 'false') {
    conditions.push({
      OR: [
        {
          status: {
            notIn: ['ISSUED', 'SENT'],
          },
        },
        {
          dueDate: null,
        },
        {
          dueDate: {
            gte: new Date(),
          },
        },
      ],
    });
  }

  const where: Prisma.InvoiceWhereInput = {
    AND: conditions,
  };

  const skip = (query.page - 1) * query.limit;

  const [invoices, total] = await prisma.$transaction([
    prisma.invoice.findMany({
      where,
      select: invoiceListSelect,
      orderBy: [
        {
          issueDate: 'desc',
        },
        {
          createdAt: 'desc',
        },
      ],
      skip,
      take: query.limit,
    }),

    prisma.invoice.count({
      where,
    }),
  ]);

  return {
    invoices: invoices.map((invoice) => ({
      ...invoice,
      isOverdue: isInvoiceOverdue(invoice),
    })),

    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    },
  };
};

export const updateInvoice = async (
  companyId: string,
  invoiceId: string,
  input: UpdateInvoiceInput,
) => {
  try {
    return await prisma.$transaction(
      async (transaction) => {
        const existingInvoice =
          await transaction.invoice.findFirst({
            where: {
              id: invoiceId,
              companyId,
            },
            select: {
              id: true,
              status: true,
              customerId: true,

              issueDate: true,
              dueDate: true,
              servicePeriodStart: true,
              servicePeriodEnd: true,

              workOrders: {
                select: {
                  workOrderId: true,
                },
              },
            },
          });

        if (!existingInvoice) {
          throw new AppError(404, 'Invoice not found');
        }

        if (existingInvoice.status !== 'DRAFT') {
          throw new AppError(
            409,
            'Only draft invoices can be edited',
          );
        }

        const nextCustomerId =
          input.customerId ??
          existingInvoice.customerId;

        const customer = await getCustomerForInvoice(
          transaction,
          companyId,
          nextCustomerId,
        );

        const existingWorkOrderIds =
          existingInvoice.workOrders.map(
            (item) => item.workOrderId,
          );

        const nextWorkOrderIds =
          input.workOrderIds ??
          existingWorkOrderIds;

        if (
          input.customerId !== undefined ||
          input.workOrderIds !== undefined
        ) {
          await verifyWorkOrders(
            transaction,
            companyId,
            nextCustomerId,
            nextWorkOrderIds,
            invoiceId,
          );
        }

        const nextIssueDate =
          input.issueDate === undefined
            ? existingInvoice.issueDate
            : input.issueDate;

        const nextDueDate =
          input.dueDate === undefined
            ? existingInvoice.dueDate
            : input.dueDate;

        if (
          nextIssueDate &&
          nextDueDate &&
          nextDueDate < nextIssueDate
        ) {
          throw new AppError(
            400,
            'Due date cannot be before the issue date',
          );
        }

        const nextServicePeriodStart =
          input.servicePeriodStart === undefined
            ? existingInvoice.servicePeriodStart
            : input.servicePeriodStart;

        const nextServicePeriodEnd =
          input.servicePeriodEnd === undefined
            ? existingInvoice.servicePeriodEnd
            : input.servicePeriodEnd;

        if (
          nextServicePeriodStart &&
          nextServicePeriodEnd &&
          nextServicePeriodEnd <
            nextServicePeriodStart
        ) {
          throw new AppError(
            400,
            'Service period end cannot be before the start date',
          );
        }

        const calculatedInvoice = input.items
          ? calculateInvoice(input.items)
          : null;

        const {
          customerId: _customerId,
          workOrderIds,
          items: _items,
          ...draftData
        } = input;

        const updateData: Prisma.InvoiceUncheckedUpdateInput =
          {
            ...draftData,
            customerId: nextCustomerId,

            ...createBuyerSnapshot(customer),

            ...(calculatedInvoice
              ? {
                  subtotalExclVat:
                    calculatedInvoice.subtotalExclVat,

                  vatTotal:
                    calculatedInvoice.vatTotal,

                  totalInclVat:
                    calculatedInvoice.totalInclVat,
                }
              : {}),
          };

        await transaction.invoice.update({
          where: {
            id: invoiceId,
          },
          data: updateData,
        });

        if (calculatedInvoice) {
          await transaction.invoiceItem.deleteMany({
            where: {
              invoiceId,
            },
          });

          await transaction.invoiceItem.createMany({
            data: calculatedInvoice.items.map(
              (item) => ({
                invoiceId,
                ...item,
              }),
            ),
          });
        }

        if (workOrderIds !== undefined) {
          await transaction.invoiceWorkOrder.deleteMany({
            where: {
              invoiceId,
            },
          });

          if (workOrderIds.length > 0) {
            await transaction.invoiceWorkOrder.createMany({
              data: workOrderIds.map(
                (workOrderId) => ({
                  invoiceId,
                  workOrderId,
                }),
              ),
            });
          }
        }

        return transaction.invoice.findUniqueOrThrow({
          where: {
            id: invoiceId,
          },
          select: invoiceSelect,
        });
      },
    );
  } catch (error) {
    return handleInvoiceConflict(error);
  }
};

const validateInvoiceSettings = (
  company: Awaited<
    ReturnType<typeof getCompanyForInvoice>
  >,
  customer: Awaited<
    ReturnType<typeof getCustomerForInvoice>
  >,
): void => {
  const missingCompanyFields: string[] = [];

  if (!company.vatNumber) {
    missingCompanyFields.push('VAT number');
  }

  if (!company.addressLine) {
    missingCompanyFields.push('address');
  }

  if (!company.postalCode) {
    missingCompanyFields.push('postal code');
  }

  if (!company.city) {
    missingCompanyFields.push('city');
  }

  if (missingCompanyFields.length > 0) {
    throw new AppError(
      400,
      `Complete the company invoice settings: ${missingCompanyFields.join(', ')}`,
    );
  }

  const missingCustomerFields: string[] = [];

  if (!customer.addressLine) {
    missingCustomerFields.push('address');
  }

  if (!customer.postalCode) {
    missingCustomerFields.push('postal code');
  }

  if (!customer.city) {
    missingCustomerFields.push('city');
  }

  if (missingCustomerFields.length > 0) {
    throw new AppError(
      400,
      `Complete the customer invoice information: ${missingCustomerFields.join(', ')}`,
    );
  }
};

export const issueInvoice = async (
  companyId: string,
  invoiceId: string,
  input: IssueInvoiceInput,
) => {
  try {
    return await prisma.$transaction(
      async (transaction) => {
        const existingInvoice =
          await transaction.invoice.findFirst({
            where: {
              id: invoiceId,
              companyId,
            },
            select: {
              id: true,
              status: true,
              issueDate: true,
              dueDate: true,
              customerId: true,

              items: {
                select: {
                  id: true,
                },
                take: 1,
              },
            },
          });

        if (!existingInvoice) {
          throw new AppError(404, 'Invoice not found');
        }

        if (existingInvoice.status !== 'DRAFT') {
          throw new AppError(
            409,
            'Only a draft invoice can be issued',
          );
        }

        if (existingInvoice.items.length === 0) {
          throw new AppError(
            400,
            'An invoice must contain at least one item',
          );
        }

        const company = await getCompanyForInvoice(
          transaction,
          companyId,
        );

        const customer = await getCustomerForInvoice(
          transaction,
          companyId,
          existingInvoice.customerId,
        );

        validateInvoiceSettings(company, customer);

        const issueDate =
          input.issueDate ??
          existingInvoice.issueDate ??
          new Date();

        const dueDate =
          input.dueDate ??
          existingInvoice.dueDate ??
          (() => {
            const calculatedDueDate =
              new Date(issueDate);

            calculatedDueDate.setUTCDate(
              calculatedDueDate.getUTCDate() +
                company.defaultPaymentTermDays,
            );

            return calculatedDueDate;
          })();

        if (dueDate < issueDate) {
          throw new AppError(
            400,
            'Due date cannot be before the issue date',
          );
        }

        const year = issueDate.getUTCFullYear();

        const prefix = company.invoicePrefix
          .trim()
          .toUpperCase();

        if (!/^[A-Z0-9-]{1,20}$/.test(prefix)) {
          throw new AppError(
            400,
            'The company invoice prefix is invalid',
          );
        }

        const sequence =
          await transaction.invoiceSequence.upsert({
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

        const invoiceNumber =
          `${prefix}-${year}-` +
          sequence.lastNumber
            .toString()
            .padStart(5, '0');

        /*
         * The status condition prevents two concurrent requests from
         * issuing the same invoice. If another request issued it first,
         * this transaction rolls back its sequence increment.
         */
        const issueResult =
          await transaction.invoice.updateMany({
            where: {
              id: invoiceId,
              companyId,
              status: 'DRAFT',
            },

            data: {
              number: invoiceNumber,
              status: 'ISSUED',
              issueDate,
              dueDate,

              ...createSellerSnapshot(company),
              ...createBuyerSnapshot(customer),
            },
          });

        if (issueResult.count !== 1) {
          throw new AppError(
            409,
            'The invoice was already issued',
          );
        }

        return transaction.invoice.findUniqueOrThrow({
          where: {
            id: invoiceId,
          },
          select: invoiceSelect,
        });
      },
    );
  } catch (error) {
    return handleInvoiceConflict(error);
  }
};

export const markInvoiceAsSent = async (
  companyId: string,
  invoiceId: string,
) => {
  const invoice = await prisma.invoice.findFirst({
    where: {
      id: invoiceId,
      companyId,
    },
    select: {
      id: true,
      status: true,
    },
  });

  if (!invoice) {
    throw new AppError(404, 'Invoice not found');
  }

  if (invoice.status === 'SENT') {
    return getInvoice(companyId, invoiceId);
  }

  if (invoice.status !== 'ISSUED') {
    throw new AppError(
      409,
      'Only an issued invoice can be marked as sent',
    );
  }

  await prisma.invoice.update({
    where: {
      id: invoiceId,
    },
    data: {
      status: 'SENT',
      sentAt: new Date(),
    },
  });

  return getInvoice(companyId, invoiceId);
};

export const markInvoiceAsPaid = async (
  companyId: string,
  invoiceId: string,
  input: MarkInvoicePaidInput,
) => {
  const invoice = await prisma.invoice.findFirst({
    where: {
      id: invoiceId,
      companyId,
    },
    select: {
      id: true,
      status: true,
    },
  });

  if (!invoice) {
    throw new AppError(404, 'Invoice not found');
  }

  if (invoice.status === 'PAID') {
    return getInvoice(companyId, invoiceId);
  }

  if (
    invoice.status !== 'ISSUED' &&
    invoice.status !== 'SENT'
  ) {
    throw new AppError(
      409,
      'Only an issued or sent invoice can be marked as paid',
    );
  }

  await prisma.invoice.update({
    where: {
      id: invoiceId,
    },
    data: {
      status: 'PAID',
      paidAt: input.paidAt ?? new Date(),
    },
  });

  return getInvoice(companyId, invoiceId);
};