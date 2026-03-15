# Script para crear archivos de configuración

# app.routes.ts
$routesContent = @"
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
"@

# app.config.ts
$configContent = @"
import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { routes } from './app.routes';
import { jwtInterceptor } from './core/interceptors/jwt.interceptor';
import { errorInterceptor } from './core/interceptors/error.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(
      withInterceptors([jwtInterceptor, errorInterceptor])
    ),
    provideAnimationsAsync()
  ]
};
"@

# app.component.ts
$appComponentContent = @"
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: '<router-outlet></router-outlet>',
  styles: []
})
export class AppComponent {
  title = 'asamblea-regional-backoffice';
}
"@

# Escribir archivos
$routesContent | Out-File -FilePath "src/app/app.routes.ts" -Encoding UTF8 -NoNewline
$configContent | Out-File -FilePath "src/app/app.config.ts" -Encoding UTF8 -NoNewline
$appComponentContent | Out-File -FilePath "src/app/app.component.ts" -Encoding UTF8 -NoNewline

Write-Host "Archivos creados exitosamente"

