import type { NextFunction, Request, Response } from 'express';

import { AppError } from '../common/errors/app-error.js';
import { verifyAccessToken } from '../modules/auth/token.service.js';

export const authenticate = async (
  request: Request,
  _response: Response,
  next: NextFunction,
): Promise<void> => {
  const authorizationHeader = request.headers.authorization;

  if (!authorizationHeader?.startsWith('Bearer ')) {
    next(new AppError(401, 'Authentication token is required'));
    return;
  }

  const token = authorizationHeader.slice(7).trim();

  if (!token) {
    next(new AppError(401, 'Authentication token is required'));
    return;
  }

  try {
    request.authUser = await verifyAccessToken(token);
    next();
  } catch {
    next(new AppError(401, 'Authentication token is invalid or expired'));
  }
};