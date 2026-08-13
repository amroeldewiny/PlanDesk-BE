import { z } from 'zod';

/**
 * Validates the information required to create a company and its
 * first owner account.
 *
 * Validation happens before the controller calls the service layer.
 */
export const registerSchema = z.object({
  companyName: z
    .string()
    .trim()
    .min(
      2,
      'Company name must contain at least 2 characters',
    )
    .max(
      100,
      'Company name cannot exceed 100 characters',
    ),

  vatNumber: z
    .string()
    .trim()
    .max(
      20,
      'VAT number cannot exceed 20 characters',
    )
    .optional(),

  firstName: z
    .string()
    .trim()
    .min(
      2,
      'First name must contain at least 2 characters',
    )
    .max(
      50,
      'First name cannot exceed 50 characters',
    ),

  lastName: z
    .string()
    .trim()
    .min(
      2,
      'Last name must contain at least 2 characters',
    )
    .max(
      50,
      'Last name cannot exceed 50 characters',
    ),

  /**
   * Email addresses are normalized before database queries so
   * uppercase and lowercase variants are treated consistently.
   */
  email: z
    .email('Enter a valid email address')
    .trim()
    .toLowerCase(),

  /**
   * The 72-character maximum matches bcrypt's effective password
   * input limit.
   */
  password: z
    .string()
    .min(
      8,
      'Password must contain at least 8 characters',
    )
    .max(
      72,
      'Password cannot exceed 72 characters',
    )
    .regex(
      /[a-z]/,
      'Password must contain a lowercase letter',
    )
    .regex(
      /[A-Z]/,
      'Password must contain an uppercase letter',
    )
    .regex(
      /[0-9]/,
      'Password must contain a number',
    ),
});

export type RegisterInput =
  z.infer<typeof registerSchema>;

/**
 * Login accepts the normalized email address and requires a
 * non-empty password. Password verification happens in the service.
 */
export const loginSchema = z.object({
  email: z
    .email('Enter a valid email address')
    .trim()
    .toLowerCase(),

  password: z
    .string()
    .min(1, 'Password is required'),
});

export type LoginInput =
  z.infer<typeof loginSchema>;