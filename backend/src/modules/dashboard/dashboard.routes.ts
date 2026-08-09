import { Router } from 'express';

import { authenticate } from '../../middleware/auth.middleware.js';
import { requireCompanyContext } from '../../middleware/company-context.middleware.js';
import { getDashboardSummaryHandler } from './dashboard.controller.js';

export const dashboardRouter = Router();

/**
 * Dashboard statistics must always be restricted to the authenticated
 * user's company.
 */
dashboardRouter.use(authenticate, requireCompanyContext);

dashboardRouter.get('/summary', getDashboardSummaryHandler);