import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { ForgotPasswordComponent } from './components/forgot-password/forgot-password.component';
import { ResetPasswordComponent } from './components/reset-password/reset-password.component';
import { LayoutComponent } from './components/layout/layout.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { DepartamentosComponent } from './components/departamentos/departamentos.component';
import { RolesComponent } from './components/roles/roles.component';
import { VoluntariosComponent } from './components/voluntarios/voluntarios.component';
import { FormacionesComponent } from './components/formaciones/formaciones.component';
import { EventosComponent } from './components/eventos/eventos.component';
import { EventoVoluntariosComponent } from './components/evento-voluntarios/evento-voluntarios.component';
import { CheckInComponent } from './components/check-in/check-in.component';
import { EstadisticasComponent } from './components/estadisticas/estadisticas.component';
import { MisPasesComponent } from './components/mis-pases/mis-pases.component';
import { authGuard, roleGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'recuperar-contrasena', component: ForgotPasswordComponent },
  { path: 'restablecer-contrasena', component: ResetPasswordComponent },
  {
    path: '',
    component: LayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: '',
        redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard',
        loadComponent: () => import('./components/dashboard/dashboard.component')
          .then(m => m.DashboardComponent)
        },
      { path: 'departamentos',
        loadComponent: () => import('./components/departamentos/departamentos.component')
          .then(m => m.DepartamentosComponent)
        , canActivate: [roleGuard(['ADMIN'])] },
      { path: 'roles',
        loadComponent: () => import('./components/roles/roles.component')
          .then( m => m.RolesComponent),
        canActivate: [roleGuard(['ADMIN'])] },
      { path: 'voluntarios',
        loadComponent: () => import('./components/voluntarios/voluntarios.component')
          .then(m => m.VoluntariosComponent),
        canActivate: [roleGuard(['ADMIN', 'COORDINADOR'])] },
      { path: 'formaciones',
        loadComponent: () => import('./components/formaciones/formaciones.component')
          .then( m => m.FormacionesComponent),
         canActivate: [roleGuard(['ADMIN', 'COORDINADOR'])] },
      { path: 'eventos',
        loadComponent: () => import('./components/eventos/eventos.component')
          .then( m => m.EventosComponent),
         canActivate: [roleGuard(['ADMIN', 'COORDINADOR'])] },
      { path: 'eventos/:id',
        loadComponent: () => import('./components/eventos/evento-detail/evento-detail.component')
          .then(m => m.EventoDetailComponent),
        canActivate: [roleGuard(['ADMIN', 'COORDINADOR'])] },
      { path: 'evento-voluntarios',
        loadComponent: () => import('./components/evento-voluntarios/evento-voluntarios.component')
          .then( m => m.EventoVoluntariosComponent),
         canActivate: [roleGuard(['ADMIN', 'COORDINADOR'])] },
      { path: 'check-in',
        loadComponent: () => import('./components/check-in/check-in.component')
          .then( m => m.CheckInComponent),
       canActivate: [roleGuard(['ADMIN', 'CHECK_IN'])] },
      { path: 'estadisticas',
        loadComponent: () => import('./components/estadisticas/estadisticas.component')
          .then(m => m.EstadisticasComponent),
         canActivate: [roleGuard(['ADMIN', 'COORDINADOR'])] },
      { path: 'mis-pases',
        loadComponent: () => import('./components/mis-pases/mis-pases.component')
          .then(m => m.MisPasesComponent),
         canActivate: [roleGuard(['VOLUNTARIO', 'ADMIN', 'COORDINADOR'])] },
      { path: 'descarga-pases',
        loadComponent: () => import('./components/descarga-qr/descarga-qr.component')
          .then(m => m.DescargaQrComponent),
        canActivate: [roleGuard(['ADMIN', 'COORDINADOR'])] },
      { path: 'admin',
        loadComponent: () => import('./components/admin-panel/admin-panel.component')
          .then(m => m.AdminPanelComponent),
        canActivate: [roleGuard(['ADMIN'])] }
    ]
  },
  { path: '**', redirectTo: '' }
];
