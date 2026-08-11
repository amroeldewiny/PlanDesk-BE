import { Router } from 'express';

import { authenticate } from '../../middleware/auth.middleware.js';
import { requireCompanyContext } from '../../middleware/company-context.middleware.js';
import {
  createWorkOrderHandler,
  getWorkOrderHandler,
  listWorkOrdersHandler,
  updateWorkOrderHandler,
} from './work-order.controller.js';

import {
  authorizeRoles,
  COMPANY_MANAGEMENT_ROLES,
} from '../../middleware/role.middleware.js';

export const workOrderRouter = Router();

/**
 * Every Work Order endpoint requires:
 * 1. A valid authenticated user.
 * 2. A verified company context for tenant isolation.
 */
workOrderRouter.use(
  authenticate,
    authorizeRoles(...COMPANY_MANAGEMENT_ROLES),
  requireCompanyContext
);

workOrderRouter.get('/', listWorkOrdersHandler);
workOrderRouter.post('/', createWorkOrderHandler);
workOrderRouter.get('/:id', getWorkOrderHandler);
workOrderRouter.patch('/:id', updateWorkOrderHandler);