import { Router } from 'express';
import rateLimit from 'express-rate-limit';

import { authenticate } from '../../middleware/auth.middleware.js';
import { getMe,login, register } from './auth.controller.js';

export const authRouter = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: {
    success: false,
    message: 'Too many login attempts. Please try again later.',
  },
});

const registrationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many registration attempts. Please try again later.',
  },
});

authRouter.post('/register', registrationLimiter, register);
authRouter.post('/login', loginLimiter, login);
authRouter.get('/me', authenticate, getMe);
