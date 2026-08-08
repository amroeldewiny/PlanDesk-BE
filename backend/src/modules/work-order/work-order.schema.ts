import { z } from 'zod';

const workOrderStatuses = [
  'DRAFT',
  'PLANNED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
] as const;

const workOrderPriorities = [
  'LOW',
  'NORMAL',
  'HIGH',
  'URGENT',
] as const;

const optionalText = (maximum: number) =>
  z
    .union([
      z.string().trim().max(maximum),
      z.null(),
    ])
    .optional()
    .transform((value) => {
      if (value === '') {
        return null;
      }

      return value;
    });

const optionalDate = z.preprocess(
  (value) => {
    if (value === '' || value === null) {
      return null;
    }

    return value;
  },
  z
    .union([
      z.coerce.date(),
      z.null(),
    ])
    .optional(),
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

const employeeIdsSchema = z
  .array(z.uuid('Employee ID is invalid'))
  .max(
    50,
    'A work order cannot contain more than 50 employees',
  )
  .refine(
    (employeeIds) =>
      new Set(employeeIds).size === employeeIds.length,
    {
      message: 'An employee cannot be assigned more than once',
    },
  );

const workOrderFields = {
  customerId: z.uuid('Customer ID is invalid'),

  title: z
    .string()
    .trim()
    .min(2, 'Title must contain at least 2 characters')
    .max(150, 'Title cannot exceed 150 characters'),

  description: optionalText(3000),

  status: z.enum(workOrderStatuses),

  priority: z.enum(workOrderPriorities),

  scheduledStart: optionalDate,
  scheduledEnd: optionalDate,

  addressLine: optionalText(200),
  postalCode: optionalText(20),
  city: optionalText(100),

  countryCode: z
    .string()
    .trim()
    .length(2, 'Country code must contain 2 characters')
    .toUpperCase(),

  notes: optionalText(3000),

  employeeIds: employeeIdsSchema,
};

const validateSchedule = (
  data: {
    scheduledStart?: Date | null;
    scheduledEnd?: Date | null;
  },
  context: z.RefinementCtx,
): void => {
  if (
    data.scheduledStart &&
    data.scheduledEnd &&
    data.scheduledEnd <= data.scheduledStart
  ) {
    context.addIssue({
      code: 'custom',
      path: ['scheduledEnd'],
      message: 'Scheduled end must be after scheduled start',
    });
  }
};

export const createWorkOrderSchema = z
  .object({
    ...workOrderFields,

    status: z
    .enum([
        'DRAFT',
        'PLANNED',
    ])
    .default('DRAFT'),

    priority: z
      .enum(workOrderPriorities)
      .default('NORMAL'),

    countryCode: z
      .string()
      .trim()
      .length(2)
      .toUpperCase()
      .optional(),

    employeeIds: employeeIdsSchema.default([]),
  })
  .superRefine(validateSchedule);

export const updateWorkOrderSchema = z
  .object(workOrderFields)
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  })
  .superRefine(validateSchedule);

export const workOrderIdSchema = z.uuid(
  'Work order ID is invalid',
);

export const workOrderListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(100).default(''),

  status: z
    .enum([
      ...workOrderStatuses,
      'ALL',
    ])
    .default('ALL'),

  priority: z
    .enum([
      ...workOrderPriorities,
      'ALL',
    ])
    .default('ALL'),

  customerId: z.uuid().optional(),
  employeeId: z.uuid().optional(),
  dateFrom: filterDate,
  dateTo: filterDate,
});

export type CreateWorkOrderInput = z.infer<
  typeof createWorkOrderSchema
>;

export type UpdateWorkOrderInput = z.infer<
  typeof updateWorkOrderSchema
>;

export type WorkOrderListQuery = z.infer<
  typeof workOrderListQuerySchema
>;