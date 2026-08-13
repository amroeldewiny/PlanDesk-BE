import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';

import { environment } from '../../environments/environment';
import { TokenStorageService } from '../services/token-storage.service';

/**
 * Adds the bearer token only to PlanDesk API requests. Restricting the target
 * prevents credentials from being attached to unrelated third-party calls.
 */
export const authTokenInterceptor: HttpInterceptorFn = (request, next) => {
  const tokenStorage = inject(TokenStorageService);
  const accessToken = tokenStorage.getAccessToken();

  if (!accessToken || !request.url.startsWith(environment.apiUrl)) {
    return next(request);
  }

  return next(
    request.clone({
      setHeaders: {
        Authorization: `Bearer ${accessToken}`,
      },
    }),
  );
};
