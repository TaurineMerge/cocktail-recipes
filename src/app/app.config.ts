import {
  ApplicationConfig,
  ErrorHandler,
  LOCALE_ID,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { registerLocaleData } from '@angular/common';
import localeRu from '@angular/common/locales/ru';

import { routes } from './app.routes';
import { CocktailRepository } from './features/cocktails/cocktail.repository';
import { CocktailApiService } from './features/cocktails/cocktail-api.service';
import { AuthRepository } from './core/auth/auth.repository';
import { AuthApiService } from './core/auth/services/auth-api.service';
import { attachTokenInterceptor } from './core/auth/interceptors/attach-token.interceptor';
import { refreshOnUnauthorizedInterceptor } from './core/auth/interceptors/refresh-on-unauthorized.interceptor';
import { httpErrorLoggingInterceptor } from './core/logging/http-error-logging.interceptor';
import { GlobalErrorHandler } from './core/logging/global-error-handler';

registerLocaleData(localeRu);

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideAnimationsAsync(),
    provideHttpClient(
      withInterceptors([
        httpErrorLoggingInterceptor,
        attachTokenInterceptor,
        refreshOnUnauthorizedInterceptor,
      ]),
    ),
    { provide: LOCALE_ID, useValue: 'ru' },
    { provide: CocktailRepository, useClass: CocktailApiService },
    { provide: AuthRepository, useClass: AuthApiService },
    { provide: ErrorHandler, useClass: GlobalErrorHandler },
  ],
};
