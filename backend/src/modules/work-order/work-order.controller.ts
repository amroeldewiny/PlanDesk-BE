import type { NextFunction, Request, Response } from 'express';

import { AppError } from '../../common/errors/app-error.js';
import {
  createWorkOrderSchema,
  updateWorkOrderSchema,
  workOrderIdSchema,
  workOrderListQuerySchema,
} from './work-order.schema.js';
import {
  createWorkOrder,
  getWorkOrder,
  listWorkOrders,
  updateWorkOrder,
} from './work-order.service.js';

/**
 * Returns the trusted company ID added by the authentication middleware.
 * We never accept companyId from request bodies or query parameters.
 */
function getCompanyId(request: Request): string {
  if (!request.companyId) {
    throw new AppError(401, 'Company context is required');
  }

  return request.companyId;
}

/**
 * Validates the work order ID from the URL.
 */
function getWorkOrderId(request: Request): string {
  const result = workOrderIdSchema.safeParse(request.params['id']);

  if (!result.success) {
    throw new AppError(
      400,
      result.error.issues[0]?.message ?? 'Invalid work order ID',
    );
  }

  return result.data;
}

export async function createWorkOrderHandler(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const companyId = getCompanyId(request);
    const result = createWorkOrderSchema.safeParse(request.body);

    if (!result.success) {
      throw new AppError(
        400,
        result.error.issues[0]?.message ?? 'Invalid work order data',
      );
    }

    const workOrder = await createWorkOrder(companyId, result.data);

    response.status(201).json({
      success: true,
      message: 'Work order created successfully',
      data: {
        workOrder,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function listWorkOrdersHandler(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const companyId = getCompanyId(request);
    const result = workOrderListQuerySchema.safeParse(request.query);

    if (!result.success) {
      throw new AppError(
        400,
        result.error.issues[0]?.message ?? 'Invalid work order filters',
      );
    }

    const workOrders = await listWorkOrders(companyId, result.data);

    response.status(200).json({
      success: true,
      message: 'Work orders retrieved successfully',
      data: workOrders,
    });
  } catch (error) {
    next(error);
  }
}

export async function getWorkOrderHandler(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const companyId = getCompanyId(request);
    const workOrderId = getWorkOrderId(request);

    const workOrder = await getWorkOrder(companyId, workOrderId);

    response.status(200).json({
      success: true,
      message: 'Work order retrieved successfully',
      data: {
        workOrder,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function updateWorkOrderHandler(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const companyId = getCompanyId(request);
    const workOrderId = getWorkOrderId(request);
    const result = updateWorkOrderSchema.safeParse(request.body);

    if (!result.success) {
      throw new AppError(
        400,
        result.error.issues[0]?.message ?? 'Invalid work order data',
      );
    }

    const workOrder = await updateWorkOrder(
      companyId,
      workOrderId,
      result.data,
    );

    response.status(200).json({
      success: true,
      message: 'Work order updated successfully',
      data: {
        workOrder,
      },
    });
  } catch (error) {
    next(error);
  }
}