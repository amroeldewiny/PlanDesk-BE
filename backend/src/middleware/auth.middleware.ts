import type {
  NextFunction,
  Request,
  Response,
} from 'express';

import { AppError } from '../common/errors/app-error.js';
import { verifyAccessToken } from '../modules/auth/token.service.js';

/**
 * Authenticates an API request using a Bearer access token.
 *
 * When successful, the verified token payload is stored in
 * request.authUser for authorization middleware and controllers.
 */
export const authenticate = async (
  request: Request,
  _response: Response,
  next: NextFunction,
): Promise<void> => {
  const authorizationHeader =
    request.headers.authorization;

  if (
    !authorizationHeader?.startsWith('Bearer ')
  ) {
    next(
      new AppError(
        401,
        'Authentication token is required',
      ),
    );
    return;
  }

  const token = authorizationHeader
    .slice(7)
    .trim();

  if (!token) {
    next(
      new AppError(
        401,
        'Authentication token is required',
      ),
    );
    return;
  }

  try {
    /**
     * Token verification checks the signature, expiration and
     * expected JWT configuration before trusting its payload.
     */
    request.authUser =
      await verifyAccessToken(token);

    next();
  } catch {
    /**
     * Do not expose detailed JWT errors because they could reveal
     * unnecessary authentication information to an attacker.
     */
    next(
      new AppError(
        401,
        'Authentication token is invalid or expired',
      ),
    );
  }
};