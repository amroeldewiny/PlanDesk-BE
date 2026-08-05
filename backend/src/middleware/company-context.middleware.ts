import type { NextFunction, Request, Response } from 'express';

import { AppError } from '../common/errors/app-error.js';
import { prisma } from '../config/database.js';

export const requireCompanyContext = async (
  request: Request,
  _response: Response,
  next: NextFunction,
): Promise<void> => {
  const authUser = request.authUser;

  if (!authUser) {
    next(new AppError(401, 'Authentication is required'));
    return;
  }

  if (!authUser.companyId) {
    next(new AppError(403, 'A company account is required'));
    return;
  }

  try {
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
      next(new AppError(403, 'Company access is no longer active'));
      return;
    }

    request.companyId = user.companyId;
    next();
  } catch (error) {
    next(error);
  }
};
