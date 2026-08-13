import { z } from "zod";

/**
 * Normalizes optional form fields for PostgreSQL. An omitted value stays
 * undefined during updates, while an explicitly cleared value becomes null.
 */
const optionalText = (maximum: number) =>
  z
    .union([z.string().trim().max(maximum), z.null()])
    .optional()
    .transform((value) => (value === "" ? null : value));

const optionalEmail = z
  .union([
    z.email("Enter a valid email address").trim().toLowerCase(),
    z.literal(""),
    z.null(),
  ])
  .optional()
  .transform((value) => (value === "" ? null : value));

const customerFields = {
  name: z.string().trim().min(2).max(150),
  contactPerson: optionalText(100),
  email: optionalEmail,
  phone: optionalText(30),
  vatNumber: optionalText(30),
  addressLine: optionalText(200),
  postalCode: optionalText(20),
  city: optionalText(100),
  countryCode: z.string().trim().length(2).toUpperCase(),
  notes: optionalText(2000),
};

export const createCustomerSchema = z.object({
  ...customerFields,
  countryCode: customerFields.countryCode.default("BE"),
});

// Keep create-only defaults out of PATCH requests to avoid changing
// unrelated fields when the client sends a partial update.
export const updateCustomerSchema = z
  .object(customerFields)
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

export const customerIdSchema = z.uuid();

export const customerListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(100).default(""),
  status: z.enum(["active", "archived", "all"]).default("active"),
});

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
export type CustomerListQuery = z.infer<typeof customerListQuerySchema>;
