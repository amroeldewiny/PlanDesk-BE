import type {
  NextFunction,
  Request,
  Response,
} from 'express';

import { AppError } from '../common/errors/app-error.js';
import { prisma } from '../config/database.js';

/**
 * Establishes the trusted company context for a protected request.
 *
 * Authentication must run first because this middleware uses the
 * verified user identity stored in request.authUser.
 */
export const requireCompanyContext = async (
  request: Request,
  _response: Response,
  next: NextFunction,
): Promise<void> => {
  const authUser = request.authUser;

  if (!authUser) {
    next(
      new AppError(
        401,
        'Authentication is required',
      ),
    );
    return;
  }

  if (!authUser.companyId) {
    next(
      new AppError(
        403,
        'A company account is required',
      ),
    );
    return;
  }

  try {
    /**
     * Revalidate the user and company against the database.
     *
     * A valid JWT may remain active after a user or company has
     * been disabled, so token claims alone are not sufficient.
     */
    const user = await prisma.user.findFirst({
      where: {
        id: authUser.userId,
        companyId: authUser.companyId,
        isActive: true,
        company: {
          isActive: true,
        },
      },
      select: {
        companyId: true,
      },
    });

    if (!user?.companyId) {
      next(
        new AppError(
          403,
          'Company access is no longer active',
        ),
      );
      return;
    }

    /**
     * Services must use this verified company ID for all
     * company-owned database queries.
     */
    request.companyId = user.companyId;

    next();
  } catch (error) {
    next(error);
  }
};