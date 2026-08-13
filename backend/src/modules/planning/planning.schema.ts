import { z } from "zod";

const planningStatuses = z.enum([
  "DRAFT",
  "PLANNED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
]);

const isoDateSchema = z
  .string()
  .datetime({
    offset: true,
    message: "Date must be a valid ISO date with timezone information",
  })
  .transform((value) => new Date(value));

const booleanQuerySchema = z
  .enum(["true", "false"])
  .default("true")
  .transform((value) => value === "true");

export const planningQuerySchema = z
  .object({
    from: isoDateSchema,
    to: isoDateSchema,

    employeeId: z.string().uuid("Employee ID must be a valid UUID").optional(),

    customerId: z.string().uuid("Customer ID must be a valid UUID").optional(),

    status: planningStatuses.or(z.literal("ALL")).default("ALL"),

    includeUnscheduled: booleanQuerySchema,
  })
  .superRefine((query, context) => {
    if (query.to <= query.from) {
      context.addIssue({
        code: "custom",
        path: ["to"],
        message: "The end date must be after the start date",
      });
    }

    // Bound expensive calendar queries while allowing two full months.
    const maximumRangeInMilliseconds = 62 * 24 * 60 * 60 * 1000;

    if (
      query.to.getTime() - query.from.getTime() >
      maximumRangeInMilliseconds
    ) {
      context.addIssue({
        code: "custom",
        path: ["to"],
        message: "The planning range cannot exceed 62 days",
      });
    }
  });

export type PlanningQuery = z.infer<typeof planningQuerySchema>;
