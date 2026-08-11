import { inject } from '@angular/core';
import {
  CanActivateFn,
  Router,
} from '@angular/router';
import { catchError, map, of } from 'rxjs';

import { AuthService } from '../services/auth.service';

const MANAGEMENT_ROLES = new Set([
  'COMPANY_OWNER',
  'COMPANY_ADMIN',
]);

/**
 * Protects the management portal from authenticated users who do not
 * have a company management role.
 *
 * The backend still remains the final security authority.
 */
export const managementGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const redirectToLogin = () => {
    authService.logout();

    return router.createUrlTree(['/login'], {
      queryParams: {
        reason: 'forbidden',
      },
    });
  };

  const currentUser = authService.currentUser();

  if (currentUser) {
    return MANAGEMENT_ROLES.has(currentUser.role)
      ? true
      : redirectToLogin();
  }

  return authService.loadCurrentUser().pipe(
    map((response) => {
      const user = response.data?.user;

      if (!user) {
        return redirectToLogin();
      }

      return MANAGEMENT_ROLES.has(user.role)
        ? true
        : redirectToLogin();
    }),
    catchError(() => of(redirectToLogin())),
  );
};