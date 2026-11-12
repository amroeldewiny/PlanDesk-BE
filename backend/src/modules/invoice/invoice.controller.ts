import type {
  NextFunction,
  Request,
  Response,
} from 'express';

import { AppError } from '../../common/errors/app-error.js';

import {
  createInvoiceSchema,
  invoiceIdSchema,
  invoiceListQuerySchema,
  issueInvoiceSchema,
  markInvoicePaidSchema,
  updateInvoiceSchema,
} from './invoice.schema.js';

import {
  createInvoice,
  getInvoice,
  issueInvoice,
  listInvoices,
  markInvoiceAsPaid,
  markInvoiceAsSent,
  updateInvoice,
} from './invoice.service.js';

/**
 * companyId is added by requireCompanyContext middleware.
 * Controllers never accept companyId from the browser.
 */
const getCompanyId = (request: Request): string => {
  if (!request.companyId) {
    throw new AppError(
      403,
      'A company account is required',
    );
  }

  return request.companyId;
};

export const createInvoiceHandler = async (
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const validationResult =
      createInvoiceSchema.safeParse(request.body);

    if (!validationResult.success) {
      throw new AppError(
        400,
        'Invoice information is invalid',
        validationResult.error.issues,
      );
    }

    const invoice = await createInvoice(
      getCompanyId(request),
      validationResult.data,
    );

    response.status(201).json({
      success: true,
      message: 'Invoice draft created successfully',
      data: {
        invoice,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const listInvoicesHandler = async (
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const validationResult =
      invoiceListQuerySchema.safeParse(request.query);

    if (!validationResult.success) {
      throw new AppError(
        400,
        'Invoice filters are invalid',
        validationResult.error.issues,
      );
    }

    const result = await listInvoices(
      getCompanyId(request),
      validationResult.data,
    );

    response.status(200).json({
      success: true,
      message: 'Invoices retrieved successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getInvoiceHandler = async (
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const invoiceIdResult = invoiceIdSchema.safeParse(
      request.params.id,
    );

    if (!invoiceIdResult.success) {
      throw new AppError(
        400,
        'Invoice ID is invalid',
        invoiceIdResult.error.issues,
      );
    }

    const invoice = await getInvoice(
      getCompanyId(request),
      invoiceIdResult.data,
    );

    response.status(200).json({
      success: true,
      message: 'Invoice retrieved successfully',
      data: {
        invoice,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateInvoiceHandler = async (
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const invoiceIdResult = invoiceIdSchema.safeParse(
      request.params.id,
    );

    if (!invoiceIdResult.success) {
      throw new AppError(
        400,
        'Invoice ID is invalid',
        invoiceIdResult.error.issues,
      );
    }

    const inputResult =
      updateInvoiceSchema.safeParse(request.body);

    if (!inputResult.success) {
      throw new AppError(
        400,
        'Invoice information is invalid',
        inputResult.error.issues,
      );
    }

    const invoice = await updateInvoice(
      getCompanyId(request),
      invoiceIdResult.data,
      inputResult.data,
    );

    response.status(200).json({
      success: true,
      message: 'Invoice draft updated successfully',
      data: {
        invoice,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const issueInvoiceHandler = async (
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const invoiceIdResult = invoiceIdSchema.safeParse(
      request.params.id,
    );

    if (!invoiceIdResult.success) {
      throw new AppError(
        400,
        'Invoice ID is invalid',
        invoiceIdResult.error.issues,
      );
    }

    const inputResult = issueInvoiceSchema.safeParse(
      request.body ?? {},
    );

    if (!inputResult.success) {
      throw new AppError(
        400,
        'Invoice issue information is invalid',
        inputResult.error.issues,
      );
    }

    const invoice = await issueInvoice(
      getCompanyId(request),
      invoiceIdResult.data,
      inputResult.data,
    );

    response.status(200).json({
      success: true,
      message: 'Invoice issued successfully',
      data: {
        invoice,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const markInvoiceSentHandler = async (
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const invoiceIdResult = invoiceIdSchema.safeParse(
      request.params.id,
    );

    if (!invoiceIdResult.success) {
      throw new AppError(
        400,
        'Invoice ID is invalid',
        invoiceIdResult.error.issues,
      );
    }

    const invoice = await markInvoiceAsSent(
      getCompanyId(request),
      invoiceIdResult.data,
    );

    response.status(200).json({
      success: true,
      message: 'Invoice marked as sent',
      data: {
        invoice,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const markInvoicePaidHandler = async (
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const invoiceIdResult = invoiceIdSchema.safeParse(
      request.params.id,
    );

    if (!invoiceIdResult.success) {
      throw new AppError(
        400,
        'Invoice ID is invalid',
        invoiceIdResult.error.issues,
      );
    }

    const inputResult =
      markInvoicePaidSchema.safeParse(
        request.body ?? {},
      );

    if (!inputResult.success) {
      throw new AppError(
        400,
        'Payment information is invalid',
        inputResult.error.issues,
      );
    }

    const invoice = await markInvoiceAsPaid(
      getCompanyId(request),
      invoiceIdResult.data,
      inputResult.data,
    );

    response.status(200).json({
      success: true,
      message: 'Invoice marked as paid',
      data: {
        invoice,
      },
    });
  } catch (error) {
    next(error);
  }
};