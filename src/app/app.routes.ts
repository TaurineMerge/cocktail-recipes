import { Routes } from '@angular/router';
import { authGuard } from './core/auth/guards/auth.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'cocktails' },
  {
    path: '',
    loadComponent: () =>
      import('./features/auth/auth-shell/auth-shell.component').then((m) => m.AuthShellComponent),
    children: [
      {
        path: 'register',
        title: 'Регистрация — Барная карта',
        loadComponent: () =>
          import('./features/auth/register/register.component').then((m) => m.RegisterComponent),
      },
      {
        path: 'login',
        title: 'Вход — Барная карта',
        loadComponent: () =>
          import('./features/auth/login/login.component').then((m) => m.LoginComponent),
      },
    ],
  },
  {
    path: 'cocktails',
    canActivate: [authGuard],
    title: 'Коктейли — Барная карта',
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/cocktails/cocktails-list/cocktails-list.component').then(
            (m) => m.CocktailsListComponent,
          ),
      },
      {
        path: 'new',
        title: 'Новый рецепт — Барная карта',
        loadComponent: () =>
          import('./features/cocktails/cocktail-form/cocktail-form.component').then(
            (m) => m.CocktailFormComponent,
          ),
      },
      {
        path: ':id',
        loadComponent: () =>
          import('./features/cocktails/cocktail-detail/cocktail-detail.component').then(
            (m) => m.CocktailDetailComponent,
          ),
      },
      {
        path: ':id/edit',
        loadComponent: () =>
          import('./features/cocktails/cocktail-form/cocktail-form.component').then(
            (m) => m.CocktailFormComponent,
          ),
      },
    ],
  },
  { path: '**', redirectTo: 'cocktails' },
];
