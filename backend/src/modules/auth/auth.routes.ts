import { Router } from 'express';
import rateLimit from 'express-rate-limit';

import { authenticate } from '../../middleware/auth.middleware.js';
import {
  getMe,
  login,
  register,
} from './auth.controller.js';

export const authRouter = Router();

/**
 * Limits repeated failed login attempts from the same client.
 *
 * Successful requests are excluded so normal user activity does not
 * consume the failed-login allowance.
 */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: {
    success: false,
    message:
      'Too many login attempts. Please try again later.',
  },
});

/**
 * Limits public company registrations to reduce automated abuse.
 */
const registrationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    success: false,
    message:
      'Too many registration attempts. Please try again later.',
  },
});

/**
 * Public authentication endpoints.
 */
authRouter.post(
  '/register',
  registrationLimiter,
  register,
);

authRouter.post(
  '/login',
  loginLimiter,
  login,
);

/**
 * Protected endpoint used by the frontend to restore and verify the
 * current authenticated session.
 */
authRouter.get(
  '/me',
  authenticate,
  getMe,
);