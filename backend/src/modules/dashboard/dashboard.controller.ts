import type { NextFunction, Request, Response } from 'express';

import { AppError } from '../../common/errors/app-error.js';
import { getDashboardSummary } from './dashboard.service.js';

function getCompanyId(request: Request): string {
  if (!request.companyId) {
    throw new AppError(401, 'Company context is required');
  }

  return request.companyId;
}

export async function getDashboardSummaryHandler(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const companyId = getCompanyId(request);
    const summary = await getDashboardSummary(companyId);

    response.status(200).json({
      success: true,
      message: 'Dashboard summary retrieved successfully',
      data: summary,
    });
  } catch (error) {
    next(error);
  }
}