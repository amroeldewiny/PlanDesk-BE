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

export const employeeRouter = Router();

employeeRouter.use(
  authenticate,
  requireCompanyContext,
);

employeeRouter.get('/', list);
employeeRouter.post('/', create);
employeeRouter.patch('/:id/restore', restore);
employeeRouter.get('/:id', getOne);
employeeRouter.patch('/:id', update);
employeeRouter.delete('/:id', archive);