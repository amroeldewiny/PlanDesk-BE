import { Router } from 'express';

import { authenticate } from '../../middleware/auth.middleware.js';
import {
  requireCompanyContext,
} from '../../middleware/company-context.middleware.js';
import {
  archive,
  create,
  getOne,
  list,
  restore,
  update,
} from './employee.controller.js';

import {
  authorizeRoles,
  COMPANY_MANAGEMENT_ROLES,
} from '../../middleware/role.middleware.js';

export const employeeRouter = Router();

employeeRouter.use(
  authenticate,
  authorizeRoles(...COMPANY_MANAGEMENT_ROLES),
  requireCompanyContext,
);


employeeRouter.get('/', list);
employeeRouter.post('/', create);
employeeRouter.patch('/:id/restore', restore);
employeeRouter.get('/:id', getOne);
employeeRouter.patch('/:id', update);
employeeRouter.delete('/:id', archive);