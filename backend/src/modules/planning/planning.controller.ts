import type { NextFunction, Request, Response } from 'express';

import { AppError } from '../../common/errors/app-error.js';
import { planningQuerySchema } from './planning.schema.js';
import { getPlanning } from './planning.service.js';

function getCompanyId(request: Request): string {
  if (!request.companyId) {
    throw new AppError(401, 'Company context is required');
  }

  return request.companyId;
}

export async function getPlanningHandler(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const companyId = getCompanyId(request);
    const validation = planningQuerySchema.safeParse(request.query);

    if (!validation.success) {
      throw new AppError(
        400,
        validation.error.issues[0]?.message ??
          'Invalid planning query parameters',
      );
    }

    const planning = await getPlanning(
      companyId,
      validation.data,
    );

    response.status(200).json({
      success: true,
      message: 'Planning retrieved successfully',
      data: planning,
    });
  } catch (error) {
    next(error);
  }
}