import { z } from 'zod';

const invoiceStatuses = [
  'DRAFT',
  'ISSUED',
  'SENT',
  'PAID',
] as const;

/**
 * Empty optional form fields become null so users can clear
 * previously stored values.
 */
const optionalText = (maximum: number) =>
  z
    .union([
      z.string().trim().max(maximum),
      z.null(),
    ])
    .optional()
    .transform((value) => (value === '' ? null : value));

const optionalDate = z.preprocess(
  (value) => {
    if (value === '' || value === null) {
      return null;
    }

    return value;
  },
  z.union([z.coerce.date(), z.null()]).optional(),
);

const filterDate = z.preprocess(
  (value) => {
    if (value === '' || value === undefined) {
      return undefined;
    }

    return value;
  },
  z.coerce.date().optional(),
);

export const invoiceItemSchema = z.object({
  description: z
    .string()
    .trim()
    .min(1, 'Description is required')
    .max(500, 'Description cannot exceed 500 characters'),

  unitCode: z
    .string()
    .trim()
    .min(1)
    .max(3)
    .toUpperCase()
    .default('HUR'),

  quantity: z.coerce
    .number()
    .finite()
    .positive('Quantity must be greater than zero')
    .max(999999),

  unitPriceExclVat: z.coerce
    .number()
    .finite()
    .min(0, 'Unit price cannot be negative')
    .max(99999999),

  discountPercentage: z.coerce
    .number()
    .finite()
    .min(0)
    .max(100)
    .default(0),

  vatRate: z.coerce
    .number()
    .finite()
    .min(0)
    .max(100)
    .default(21),
});

const workOrderIdsSchema = z
  .array(z.uuid('Work order ID is invalid'))
  .max(100, 'An invoice cannot contain more than 100 work orders')
  .refine(
    (workOrderIds) =>
      new Set(workOrderIds).size === workOrderIds.length,
    {
      message: 'A work order cannot be added more than once',
    },
  );

const invoiceFields = {
  customerId: z.uuid('Customer ID is invalid'),

  workOrderIds: workOrderIdsSchema,

  issueDate: optionalDate,
  dueDate: optionalDate,
  servicePeriodStart: optionalDate,
  servicePeriodEnd: optionalDate,

  currencyCode: z
    .string()
    .trim()
    .length(3)
    .toUpperCase(),

  languageCode: z.enum(['NL', 'FR', 'EN', 'DE']),

  customerReference: optionalText(100),
  paymentReference: optionalText(100),
  paymentTerms: optionalText(500),
  notes: optionalText(3000),

  items: z
    .array(invoiceItemSchema)
    .min(1, 'An invoice must contain at least one item')
    .max(100, 'An invoice cannot contain more than 100 items'),
};

const validateInvoiceDates = (
  data: {
    issueDate?: Date | null;
    dueDate?: Date | null;
    servicePeriodStart?: Date | null;
    servicePeriodEnd?: Date | null;
  },
  context: z.RefinementCtx,
): void => {
  if (
    data.issueDate &&
    data.dueDate &&
    data.dueDate < data.issueDate
  ) {
    context.addIssue({
      code: 'custom',
      path: ['dueDate'],
      message: 'Due date cannot be before the issue date',
    });
  }

  if (
    data.servicePeriodStart &&
    data.servicePeriodEnd &&
    data.servicePeriodEnd < data.servicePeriodStart
  ) {
    context.addIssue({
      code: 'custom',
      path: ['servicePeriodEnd'],
      message:
        'Service period end cannot be before the start date',
    });
  }
};

export const createInvoiceSchema = z
  .object({
    ...invoiceFields,

    workOrderIds: workOrderIdsSchema.default([]),

    currencyCode: invoiceFields.currencyCode.default('EUR'),

    languageCode: invoiceFields.languageCode.default('NL'),
  })
  .superRefine(validateInvoiceDates);

/**
 * Create-only defaults are not used here because an invoice update
 * must not change unrelated fields.
 */
export const updateInvoiceSchema = z
  .object(invoiceFields)
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  })
  .superRefine(validateInvoiceDates);

export const invoiceIdSchema = z.uuid('Invoice ID is invalid');

export const invoiceListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),

  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(100)
    .default(20),

  search: z.string().trim().max(100).default(''),

  status: z.enum([...invoiceStatuses, 'ALL']).default('ALL'),

  customerId: z.uuid().optional(),

  dateFrom: filterDate,
  dateTo: filterDate,

  overdue: z
    .enum(['true', 'false', 'all'])
    .default('all'),
});

export type InvoiceItemInput = z.infer<
  typeof invoiceItemSchema
>;

export type CreateInvoiceInput = z.infer<
  typeof createInvoiceSchema
>;

export type UpdateInvoiceInput = z.infer<
  typeof updateInvoiceSchema
>;

export type InvoiceListQuery = z.infer<
  typeof invoiceListQuerySchema
>;

export const issueInvoiceSchema = z
  .object({
    issueDate: filterDate,
    dueDate: filterDate,
  })
  .superRefine(validateInvoiceDates);

export const markInvoicePaidSchema = z.object({
  paidAt: filterDate,
});

export type IssueInvoiceInput = z.infer<
  typeof issueInvoiceSchema
>;

export type MarkInvoicePaidInput = z.infer<
  typeof markInvoicePaidSchema
>;