import type { NextFunction, Request, Response } from 'express';

import { AppError } from '../../common/errors/app-error.js';
import { loginSchema, registerSchema } from './auth.schema.js';
import {  getCurrentUser,loginUser, registerCompany } from './auth.service.js';

export const register = async (
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const validationResult = registerSchema.safeParse(request.body);

    if (!validationResult.success) {
      throw new AppError(
        400,
        'Registration information is invalid',
        validationResult.error.issues,
      );
    }

    const result = await registerCompany(validationResult.data);

    response.status(201).json({
      success: true,
      message: 'Company and owner account created successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const validationResult = loginSchema.safeParse(request.body);

    if (!validationResult.success) {
      throw new AppError(
        400,
        'Login information is invalid',
        validationResult.error.issues,
      );
    }

    const result = await loginUser(validationResult.data);

    response.status(200).json({
      success: true,
      message: 'Login successful',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!request.authUser) {
      throw new AppError(401, 'Authentication is required');
    }

    const user = await getCurrentUser(request.authUser.userId);

    response.status(200).json({
      success: true,
      message: 'Current user retrieved successfully',
      data: {
        user,
      },
    });
  } catch (error) {
    next(error);
  }
};