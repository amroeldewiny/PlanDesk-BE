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
    path: 'customers',
    canActivate: [authGuard],
    loadComponent: () =>
      import(
        './features/customers/pages/customer-list/customer-list'
      ).then((component) => component.CustomerList),
    title: 'Customers | PlanDesk BE',
  },

  {
    path: 'employees/new',
    canActivate: [authGuard],
    loadComponent: () =>
      import(
        './features/employees/pages/employee-form/employee-form'
      ).then((component) => component.EmployeeForm),
    title: 'Add Employee | PlanDesk BE',
  },
  {
    path: 'employees/:id/edit',
    canActivate: [authGuard],
    loadComponent: () =>
      import(
        './features/employees/pages/employee-form/employee-form'
      ).then((component) => component.EmployeeForm),
    title: 'Edit Employee | PlanDesk BE',
  },
  {
    path: 'employees',
    canActivate: [authGuard],
    loadComponent: () =>
      import(
        './features/employees/pages/employee-list/employee-list'
      ).then((component) => component.EmployeeList),
    title: 'Employees | PlanDesk BE',
  },

  {
    path: 'work-orders/new',
    canActivate: [authGuard],
    loadComponent: () =>
      import(
        './features/work-orders/pages/work-order-form/work-order-form'
      ).then((component) => component.WorkOrderForm),
    title: 'New Work Order | PlanDesk BE',
  },
  {
    path: 'work-orders/:id/edit',
    canActivate: [authGuard],
    loadComponent: () =>
      import(
        './features/work-orders/pages/work-order-form/work-order-form'
      ).then((component) => component.WorkOrderForm),
    title: 'Edit Work Order | PlanDesk BE',
  },
  {
    path: 'work-orders/:id',
    canActivate: [authGuard],
    loadComponent: () =>
      import(
        './features/work-orders/pages/work-order-detail/work-order-detail'
      ).then((component) => component.WorkOrderDetail),
    title: 'Work Order | PlanDesk BE',
  },
  {
    path: 'work-orders',
    canActivate: [authGuard],
    loadComponent: () =>
      import(
        './features/work-orders/pages/work-order-list/work-order-list'
      ).then((component) => component.WorkOrderList),
    title: 'Work Orders | PlanDesk BE',
  },

  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'dashboard',
  },
  {
    path: '**',
    redirectTo: 'dashboard',
  },
];