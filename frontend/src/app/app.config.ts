import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideHttpClient,   withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { authTokenInterceptor } from './core/guards/interceptors/auth-token.interceptor';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes),
    provideHttpClient(
      withInterceptors([authTokenInterceptor]),
    ),
  ],
};