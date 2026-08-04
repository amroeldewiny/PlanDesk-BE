import { Router } from 'express';

import { authenticate } from '../../middleware/auth.middleware.js';
import { getMe,login, register } from './auth.controller.js';

export const authRouter = Router();

authRouter.post('/register', register);
authRouter.post('/login', login);
authRouter.get('/me', authenticate, getMe);