import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { LayoutComponent } from './components/layout/layout.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { DepartamentosComponent } from './components/departamentos/departamentos.component';
import { RolesComponent } from './components/roles/roles.component';
import { VoluntariosComponent } from './components/voluntarios/voluntarios.component';
import { EventosComponent } from './components/eventos/eventos.component';
import { EventoVoluntariosComponent } from './components/evento-voluntarios/evento-voluntarios.component';
import { CheckInComponent } from './components/check-in/check-in.component';
import { authGuard, roleGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  {
    path: '',
    component: LayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: DashboardComponent },
      { path: 'departamentos', component: DepartamentosComponent, canActivate: [roleGuard(['ADMIN'])] },
      { path: 'roles', component: RolesComponent, canActivate: [roleGuard(['ADMIN'])] },
      { path: 'voluntarios', component: VoluntariosComponent, canActivate: [roleGuard(['ADMIN', 'COORDINADOR'])] },
      { path: 'eventos', component: EventosComponent, canActivate: [roleGuard(['ADMIN', 'COORDINADOR'])] },
      { path: 'evento-voluntarios', component: EventoVoluntariosComponent, canActivate: [roleGuard(['ADMIN', 'COORDINADOR'])] },
      { path: 'check-in', component: CheckInComponent, canActivate: [roleGuard(['ADMIN', 'CHECK_IN'])] }
    ]
  },
  { path: '**', redirectTo: '' }
];