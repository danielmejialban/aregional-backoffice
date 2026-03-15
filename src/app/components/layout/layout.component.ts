import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatToolbarModule,
    MatSidenavModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule
  ],
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.scss']
})
export class LayoutComponent {
  currentUser$;

  menuItems = [
    { icon: 'dashboard', label: 'Dashboard', route: '/dashboard', roles: ['ADMIN', 'COORDINADOR', 'VOLUNTARIO', 'CHECK_IN'] },
    { icon: 'business', label: 'Departamentos', route: '/departamentos', roles: ['ADMIN'] },
    { icon: 'admin_panel_settings', label: 'Roles', route: '/roles', roles: ['ADMIN'] },
    { icon: 'people', label: 'Voluntarios', route: '/voluntarios', roles: ['ADMIN', 'COORDINADOR'] },
    { icon: 'event', label: 'Eventos', route: '/eventos', roles: ['ADMIN', 'COORDINADOR'] },
    { icon: 'assignment', label: 'Asignaciones', route: '/evento-voluntarios', roles: ['ADMIN', 'COORDINADOR'] },
    { icon: 'qr_code_scanner', label: 'Check-In', route: '/check-in', roles: ['ADMIN', 'CHECK_IN'] }
  ];

  constructor(
    private authService: AuthService,
    private router: Router
  ) {
    this.currentUser$ = this.authService.currentUser$;
  }

  hasAccess(roles: string[]): boolean {
    return this.authService.hasAnyRole(roles);
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}