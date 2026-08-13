import type {
  NextFunction,
  Request,
  Response,
} from 'express';

import { AppError } from '../common/errors/app-error.js';

/**
 * Roles currently supported by PlanDesk BE.
 */
export type ApplicationRole =
  | 'PLATFORM_ADMIN'
  | 'COMPANY_OWNER'
  | 'COMPANY_ADMIN'
  | 'EMPLOYEE';

/**
 * Roles allowed to manage company resources during version 1.
 *
 * This shared list keeps authorization consistent across customer,
 * employee, work-order, planning and dashboard routes.
 */
export const COMPANY_MANAGEMENT_ROLES = [
  'COMPANY_OWNER',
  'COMPANY_ADMIN',
] as const satisfies readonly ApplicationRole[];

/**
 * Restricts an endpoint to authenticated users with one of the
 * explicitly permitted roles.
 *
 * The authenticate middleware must run before this middleware.
 */
export function authorizeRoles(
  ...allowedRoles: ApplicationRole[]
) {
  return (
    request: Request,
    _response: Response,
    next: NextFunction,
  ): void => {
    const authenticatedUser =
      request.authUser;

    if (!authenticatedUser) {
      next(
        new AppError(
          401,
          'Authentication is required',
        ),
      );
      return;
    }

    const hasPermission = allowedRoles.some(
      (role) =>
        role === authenticatedUser.role,
    );

    if (!hasPermission) {
      next(
        new AppError(
          403,
          'You do not have permission to perform this action',
        ),
      );
      return;
    }

    next();
  };
}