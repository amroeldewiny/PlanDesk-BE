import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/pages/login/login').then(
        (component) => component.Login,
      ),
    title: 'Login | PlanDesk BE',
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/dashboard/pages/dashboard/dashboard').then(
        (component) => component.Dashboard,
      ),
    title: 'Dashboard | PlanDesk BE',
  },
  {
    path: 'customers',
    canActivate: [authGuard],
    loadComponent: () =>
      import(
        './features/customers/pages/customer-list/customer-list'
      ).then((component) => component.CustomerList),
    title: 'Customers | PlanDesk BE',
  },
  {
    path: 'customers/new',
    canActivate: [authGuard],
    loadComponent: () =>
      import(
        './features/customers/pages/customer-form/customer-form'
      ).then((component) => component.CustomerForm),
    title: 'Add Customer | PlanDesk BE',
  },
  {
    path: 'customers/:id/edit',
    canActivate: [authGuard],
    loadComponent: () =>
      import(
        './features/customers/pages/customer-form/customer-form'
      ).then((component) => component.CustomerForm),
    title: 'Edit Customer | PlanDesk BE',
  },
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'login',
  },
  {
    path: '**',
    redirectTo: 'login',
  },
];