import type { AccessTokenPayload } from '../modules/auth/token.service.js';

declare global {
  namespace Express {
    interface Request {
      authUser?: AccessTokenPayload;
    }
  }
}

export {};