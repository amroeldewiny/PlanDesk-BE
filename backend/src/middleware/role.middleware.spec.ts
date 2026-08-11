import type {
  NextFunction,
  Request,
  Response,
} from 'express';
import {
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import { AppError } from '../common/errors/app-error.js';
import {
  type ApplicationRole,
  authorizeRoles,
} from './role.middleware.js';

function createRequest(role?: ApplicationRole): Request {
  return {
    authUser: role
      ? {
          role,
        }
      : undefined,
  } as unknown as Request;
}

describe('authorizeRoles', () => {
  it('returns 401 when the user is not authenticated', () => {
    const request = createRequest();
    const response = {} as Response;
    const next = vi.fn();

    authorizeRoles('COMPANY_OWNER')(
      request,
      response,
      next as NextFunction,
    );

    const error = next.mock.calls[0]?.[0] as AppError;

    expect(error).toBeInstanceOf(AppError);
    expect(error.statusCode).toBe(401);
  });

  it('allows a user with an accepted role', () => {
    const request = createRequest('COMPANY_OWNER');
    const response = {} as Response;
    const next = vi.fn();

    authorizeRoles('COMPANY_OWNER', 'COMPANY_ADMIN')(
      request,
      response,
      next as NextFunction,
    );

    expect(next).toHaveBeenCalledOnce();
    expect(next).toHaveBeenCalledWith();
  });

  it('returns 403 when the role is not permitted', () => {
    const request = createRequest('EMPLOYEE');
    const response = {} as Response;
    const next = vi.fn();

    authorizeRoles('COMPANY_OWNER', 'COMPANY_ADMIN')(
      request,
      response,
      next as NextFunction,
    );

    const error = next.mock.calls[0]?.[0] as AppError;

    expect(error).toBeInstanceOf(AppError);
    expect(error.statusCode).toBe(403);
  });
});