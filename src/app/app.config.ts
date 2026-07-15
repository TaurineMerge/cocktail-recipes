import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { provideHttpClient } from '@angular/common/http';
import { CocktailRepository } from './features/cocktails/cocktail.repository';
import { CocktailApiService } from './features/cocktails/cocktail-api.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(),
    { provide: CocktailRepository, useClass: CocktailApiService },
  ],
};
