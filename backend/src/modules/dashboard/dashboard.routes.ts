import { Router } from 'express';

import { authenticate } from '../../middleware/auth.middleware.js';
import { requireCompanyContext } from '../../middleware/company-context.middleware.js';
import { getDashboardSummaryHandler } from './dashboard.controller.js';
import {
  authorizeRoles,
  COMPANY_MANAGEMENT_ROLES,
} from '../../middleware/role.middleware.js';

export const dashboardRouter = Router();

/**
 * Dashboard statistics must always be restricted to the authenticated
 * user's company.
 */
dashboardRouter.use(
  authenticate,
  authorizeRoles(...COMPANY_MANAGEMENT_ROLES),
  requireCompanyContext,
);

dashboardRouter.get('/summary', getDashboardSummaryHandler);