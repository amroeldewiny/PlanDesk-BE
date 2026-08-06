import type {
  NextFunction,
  Request,
  Response,
} from 'express';

import { AppError } from '../../common/errors/app-error.js';
import {
  createEmployeeSchema,
  employeeIdSchema,
  employeeListQuerySchema,
  updateEmployeeSchema,
} from './employee.schema.js';
import {
  archiveEmployee,
  createEmployee,
  getEmployee,
  listEmployees,
  restoreEmployee,
  updateEmployee,
} from './employee.service.js';

const getCompanyId = (request: Request): string => {
  if (!request.companyId) {
    throw new AppError(403, 'A company account is required');
  }

  return request.companyId;
};

const parseEmployeeId = (request: Request): string => {
  const result = employeeIdSchema.safeParse(request.params.id);

  if (!result.success) {
    throw new AppError(
      400,
      'Employee ID is invalid',
      result.error.issues,
    );
  }

  return result.data;
};

export const create = async (
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const result = createEmployeeSchema.safeParse(request.body);

    if (!result.success) {
      throw new AppError(
        400,
        'Employee information is invalid',
        result.error.issues,
      );
    }

    const employee = await createEmployee(
      getCompanyId(request),
      result.data,
    );

    response.status(201).json({
      success: true,
      message: 'Employee created successfully',
      data: {
        employee,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const list = async (
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const result = employeeListQuerySchema.safeParse(
      request.query,
    );

    if (!result.success) {
      throw new AppError(
        400,
        'Employee filters are invalid',
        result.error.issues,
      );
    }

    const data = await listEmployees(
      getCompanyId(request),
      result.data,
    );

    response.status(200).json({
      success: true,
      message: 'Employees retrieved successfully',
      data,
    });
  } catch (error) {
    next(error);
  }
};

export const getOne = async (
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const employee = await getEmployee(
      getCompanyId(request),
      parseEmployeeId(request),
    );

    response.status(200).json({
      success: true,
      message: 'Employee retrieved successfully',
      data: {
        employee,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const update = async (
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const result = updateEmployeeSchema.safeParse(request.body);

    if (!result.success) {
      throw new AppError(
        400,
        'Employee information is invalid',
        result.error.issues,
      );
    }

    const employee = await updateEmployee(
      getCompanyId(request),
      parseEmployeeId(request),
      result.data,
    );

    response.status(200).json({
      success: true,
      message: 'Employee updated successfully',
      data: {
        employee,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const archive = async (
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const employee = await archiveEmployee(
      getCompanyId(request),
      parseEmployeeId(request),
    );

    response.status(200).json({
      success: true,
      message: 'Employee archived successfully',
      data: {
        employee,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const restore = async (
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const employee = await restoreEmployee(
      getCompanyId(request),
      parseEmployeeId(request),
    );

    response.status(200).json({
      success: true,
      message: 'Employee restored successfully',
      data: {
        employee,
      },
    });
  } catch (error) {
    next(error);
  }
};