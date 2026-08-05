import { Router } from 'express';

import { authenticate } from '../../middleware/auth.middleware.js';
import { requireCompanyContext } from '../../middleware/company-context.middleware.js';
import { archive, create, getOne, list, restore, update } from './customer.controller.js';

export const customerRouter = Router();

customerRouter.use(authenticate, requireCompanyContext);

customerRouter.get('/', list);
customerRouter.post('/', create);
customerRouter.get('/:id', getOne);
customerRouter.patch('/:id', update);
customerRouter.patch('/:id/restore', restore);
customerRouter.delete('/:id', archive);
