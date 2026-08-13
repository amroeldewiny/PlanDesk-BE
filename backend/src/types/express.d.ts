import type { AccessTokenPayload } from "../modules/auth/token.service.js";

declare global {
  namespace Express {
    interface Request {
      // These fields are populated by trusted middleware, never request input.
      authUser?: AccessTokenPayload;
      companyId?: string;
    }
  }
}

export {};
