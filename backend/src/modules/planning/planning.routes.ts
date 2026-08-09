import { Router } from 'express';

import { authenticate } from '../../middleware/auth.middleware.js';
import { requireCompanyContext } from '../../middleware/company-context.middleware.js';
import { getPlanningHandler } from './planning.controller.js';

export const planningRouter = Router();

/**
 * Planning contains company-sensitive customer and employee data,
 * so authentication and company isolation apply to every endpoint.
 */
planningRouter.use(authenticate, requireCompanyContext);

planningRouter.get('/', getPlanningHandler);