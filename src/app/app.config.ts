import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { CocktailRepository } from './features/cocktails/cocktail.repository';
import { CocktailApiService } from './features/cocktails/cocktail-api.service';
import { attachTokenInterceptor } from './core/auth/interceptors/attach-token.interceptor';
import { refreshOnUnauthorizedInterceptor } from './core/auth/interceptors/refresh-on-unauthorized.interceptor';
import { AuthRepository } from './core/auth/auth.repository';
import { AuthApiService } from './core/auth/services/auth-api.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([attachTokenInterceptor, refreshOnUnauthorizedInterceptor])),
    { provide: AuthRepository, useClass: AuthApiService },
    { provide: CocktailRepository, useClass: CocktailApiService },
  ],
};
