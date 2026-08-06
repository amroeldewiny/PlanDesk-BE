import { z } from 'zod';

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

const optionalEmail = z
  .union([
    z.email('Enter a valid email address').trim().toLowerCase(),
    z.literal(''),
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

const employeeFields = z.object({
  employeeNumber: optionalText(30),

  firstName: z
    .string()
    .trim()
    .min(2, 'First name must contain at least 2 characters')
    .max(50, 'First name cannot exceed 50 characters'),

  lastName: z
    .string()
    .trim()
    .min(2, 'Last name must contain at least 2 characters')
    .max(50, 'Last name cannot exceed 50 characters'),

  email: optionalEmail,
  phone: optionalText(30),
  jobTitle: optionalText(100),

  employmentType: z
    .enum([
      'FULL_TIME',
      'PART_TIME',
      'FLEXI_JOB',
      'STUDENT',
      'CONTRACTOR',
      'OTHER',
    ])
    .default('FULL_TIME'),

  startDate: optionalDate,
  endDate: optionalDate,
  notes: optionalText(2000),
});

export const createEmployeeSchema = employeeFields;

export const updateEmployeeSchema = employeeFields
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  });

export const employeeIdSchema = z.uuid();

export const employeeListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(100).default(''),
  status: z.enum(['active', 'archived', 'all']).default('active'),
  employmentType: z
    .enum([
      'FULL_TIME',
      'PART_TIME',
      'FLEXI_JOB',
      'STUDENT',
      'CONTRACTOR',
      'OTHER',
    ])
    .optional(),
});

export type CreateEmployeeInput = z.infer<
  typeof createEmployeeSchema
>;

export type UpdateEmployeeInput = z.infer<
  typeof updateEmployeeSchema
>;

export type EmployeeListQuery = z.infer<
  typeof employeeListQuerySchema
>;