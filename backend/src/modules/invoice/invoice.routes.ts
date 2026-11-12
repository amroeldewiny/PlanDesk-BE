import { Router } from 'express';

import { authenticate } from '../../middleware/auth.middleware.js';
import { requireCompanyContext } from '../../middleware/company-context.middleware.js';
import {
  authorizeRoles,
  COMPANY_MANAGEMENT_ROLES,
} from '../../middleware/role.middleware.js';

import {
  createInvoiceHandler,
  getInvoiceHandler,
  issueInvoiceHandler,
  listInvoicesHandler,
  markInvoicePaidHandler,
  markInvoiceSentHandler,
  updateInvoiceHandler,
} from './invoice.controller.js';

export const invoiceRouter = Router();

/**
 * Invoice management is currently available only to company
 * owners and company administrators.
 */
invoiceRouter.use(
  authenticate,
  requireCompanyContext,
  authorizeRoles(...COMPANY_MANAGEMENT_ROLES),
);

invoiceRouter.get('/', listInvoicesHandler);
invoiceRouter.post('/', createInvoiceHandler);

invoiceRouter.get('/:id', getInvoiceHandler);
invoiceRouter.patch('/:id', updateInvoiceHandler);

invoiceRouter.patch(
  '/:id/issue',
  issueInvoiceHandler,
);

invoiceRouter.patch(
  '/:id/mark-sent',
  markInvoiceSentHandler,
);

invoiceRouter.patch(
  '/:id/mark-paid',
  markInvoicePaidHandler,
);