import type { NextFunction, Request, Response } from 'express';

import { AppError } from '../../common/errors/app-error.js';
import {
  createCustomerSchema,
  customerIdSchema,
  customerListQuerySchema,
  updateCustomerSchema,
} from './customer.schema.js';
import {
  archiveCustomer,
  createCustomer,
  getCustomer,
  listCustomers,
  restoreCustomer,
  updateCustomer,
} from './customer.service.js';

const getCompanyId = (request: Request): string => {
  if (!request.companyId) {
    throw new AppError(403, 'A company account is required');
  }

  return request.companyId;
};

const parseCustomerId = (request: Request): string => {
  const result = customerIdSchema.safeParse(request.params.id);

  if (!result.success) {
    throw new AppError(400, 'Customer ID is invalid', result.error.issues);
  }

  return result.data;
};

export const create = async (
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const result = createCustomerSchema.safeParse(request.body);
    if (!result.success) {
      throw new AppError(400, 'Customer information is invalid', result.error.issues);
    }

    const customer = await createCustomer(getCompanyId(request), result.data);
    response.status(201).json({ success: true, data: { customer } });
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
    const result = customerListQuerySchema.safeParse(request.query);
    if (!result.success) {
      throw new AppError(400, 'Customer filters are invalid', result.error.issues);
    }

    const data = await listCustomers(getCompanyId(request), result.data);
    response.status(200).json({ success: true, data });
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
    const customer = await getCustomer(getCompanyId(request), parseCustomerId(request));
    response.status(200).json({ success: true, data: { customer } });
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
    const result = updateCustomerSchema.safeParse(request.body);
    if (!result.success) {
      throw new AppError(400, 'Customer information is invalid', result.error.issues);
    }

    const customer = await updateCustomer(
      getCompanyId(request),
      parseCustomerId(request),
      result.data,
    );
    response.status(200).json({ success: true, data: { customer } });
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
    const customer = await archiveCustomer(
      getCompanyId(request),
      parseCustomerId(request),
    );
    response.status(200).json({
      success: true,
      message: 'Customer archived successfully',
      data: { customer },
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
    const customer = await restoreCustomer(
      getCompanyId(request),
      parseCustomerId(request),
    );

    response.status(200).json({
      success: true,
      message: 'Customer restored successfully',
      data: {
        customer,
      },
    });
  } catch (error) {
    next(error);
  }
};
