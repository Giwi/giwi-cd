import { Routes } from '@angular/router';
import { authGuard, guestGuard, adminGuard } from './guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./pages/auth/login.component').then(m => m.LoginComponent),
    canActivate: [guestGuard]
  },
  {
    path: 'register',
    loadComponent: () => import('./pages/auth/register.component').then(m => m.RegisterComponent),
    canActivate: [guestGuard]
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent),
    canActivate: [authGuard]
  },
  {
    path: 'pipelines',
    loadComponent: () => import('./pages/pipelines/pipeline-list.component').then(m => m.PipelineListComponent),
    canActivate: [authGuard]
  },
  {
    path: 'pipelines/new',
    loadComponent: () => import('./pages/pipelines/pipeline-form.component').then(m => m.PipelineFormComponent),
    canActivate: [authGuard]
  },
  {
    path: 'pipelines/:id',
    loadComponent: () => import('./pages/pipelines/pipeline-form.component').then(m => m.PipelineFormComponent),
    canActivate: [authGuard]
  },
  {
    path: 'pipelines/:id/edit',
    loadComponent: () => import('./pages/pipelines/pipeline-form.component').then(m => m.PipelineFormComponent),
    canActivate: [authGuard]
  },
  {
    path: 'builds',
    loadComponent: () => import('./pages/builds/build-list.component').then(m => m.BuildListComponent),
    canActivate: [authGuard]
  },
  {
    path: 'builds/:id',
    loadComponent: () => import('./pages/builds/build-detail.component').then(m => m.BuildDetailComponent),
    canActivate: [authGuard]
  },
  {
    path: 'settings/credentials',
    loadComponent: () => import('./pages/settings/credential-list.component').then(m => m.CredentialListComponent),
    canActivate: [authGuard]
  },
  {
    path: 'settings/credentials/new',
    loadComponent: () => import('./pages/settings/credential-form.component').then(m => m.CredentialFormComponent),
    canActivate: [authGuard]
  },
  {
    path: 'settings/credentials/:id',
    loadComponent: () => import('./pages/settings/credential-form.component').then(m => m.CredentialFormComponent),
    canActivate: [authGuard]
  },
  {
    path: 'settings/notifications/new',
    loadComponent: () => import('./pages/settings/notification-add.component').then(m => m.NotificationAddComponent),
    canActivate: [authGuard]
  },
  {
    path: 'settings/notifications',
    loadComponent: () => import('./pages/settings/notifications.component').then(m => m.NotificationsComponent),
    canActivate: [authGuard]
  },
  {
    path: 'settings/profile',
    loadComponent: () => import('./pages/settings/profile.component').then(m => m.ProfileComponent),
    canActivate: [authGuard]
  },
  {
    path: 'settings/general',
    loadComponent: () => import('./pages/settings/admin/settings.component').then(m => m.SettingsComponent),
    canActivate: [adminGuard]
  },
  {
    path: 'settings/users',
    loadComponent: () => import('./pages/settings/admin/users.component').then(m => m.UsersComponent),
    canActivate: [adminGuard]
  },
  {
    path: '',
    loadComponent: () => import('./pages/landing.component').then(m => m.LandingComponent)
  },
  { path: 'dashboard', redirectTo: '', pathMatch: 'full' },
  { path: '**', redirectTo: '' }
];
