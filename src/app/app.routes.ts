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
import { EstadisticasComponent } from './components/estadisticas/estadisticas.component';
import { MisPasesComponent } from './components/mis-pases/mis-pases.component';
import { DescargaQrComponent } from './components/descarga-qr/descarga-qr.component';
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
      { path: 'check-in', component: CheckInComponent, canActivate: [roleGuard(['ADMIN', 'CHECK_IN'])] },
      { path: 'estadisticas', component: EstadisticasComponent, canActivate: [roleGuard(['ADMIN', 'COORDINADOR'])] },
      { path: 'mis-pases', component: MisPasesComponent, canActivate: [roleGuard(['VOLUNTARIO', 'ADMIN', 'COORDINADOR'])] },
      { path: 'descarga-qr', component: DescargaQrComponent, canActivate: [roleGuard(['ADMIN', 'COORDINADOR'])] }
    ]
  },
  { path: '**', redirectTo: '' }
];
