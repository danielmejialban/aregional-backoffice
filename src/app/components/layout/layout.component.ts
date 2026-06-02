import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { BreakpointObserver } from '@angular/cdk/layout';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AuthService } from '../../services/auth.service';
import { ThemeService } from '../../services/theme.service';

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
    MatMenuModule,
    MatTooltipModule,
  ],
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.scss']
})
export class LayoutComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private breakpointObserver = inject(BreakpointObserver);
  readonly themeService = inject(ThemeService);

  isMobile = false;
  sidenavOpen = true;
  sidenavCollapsed = false;
  currentUser$;

  menuItems = [
    { icon: 'dashboard', label: 'Dashboard', route: '/dashboard', roles: ['ADMIN', 'COORDINADOR', 'VOLUNTARIO', 'CHECK_IN'] },
    { icon: 'business', label: 'Departamentos', route: '/departamentos', roles: ['ADMIN'] },
    { icon: 'admin_panel_settings', label: 'Roles', route: '/roles', roles: ['ADMIN'] },
    { icon: 'people', label: 'Voluntarios', route: '/voluntarios', roles: ['ADMIN', 'COORDINADOR'] },
    { icon: 'school', label: 'Formaciones', route: '/formaciones', roles: ['ADMIN', 'COORDINADOR'] },
    { icon: 'event', label: 'Eventos', route: '/eventos', roles: ['ADMIN', 'COORDINADOR'] },
    { icon: 'assignment', label: 'Asignaciones', route: '/evento-voluntarios', roles: ['ADMIN', 'COORDINADOR'] },
    { icon: 'download_for_offline', label: 'Descarga de Pases', route: '/descarga-pases', roles: ['ADMIN', 'COORDINADOR'] },
    { icon: 'qr_code_scanner', label: 'Check-In', route: '/check-in', roles: ['ADMIN', 'CHECK_IN'] },
    { icon: 'bar_chart', label: 'Estadísticas', route: '/estadisticas', roles: ['ADMIN', 'COORDINADOR'] },
    { icon: 'confirmation_number', label: 'Mis Pases', route: '/mis-pases', roles: ['VOLUNTARIO', 'ADMIN', 'COORDINADOR'] },
    { icon: 'manage_accounts', label: 'Administración', route: '/admin', roles: ['ADMIN'] },
  ];

  constructor(private authService: AuthService, private router: Router) {
    this.currentUser$ = this.authService.currentUser$;
    this.isMobile = this.breakpointObserver.isMatched('(max-width: 959px)');
    this.sidenavOpen = !this.isMobile;
  }

  ngOnInit(): void {
    this.breakpointObserver
      .observe(['(max-width: 959px)'])
      .pipe(takeUntil(this.destroy$))
      .subscribe(result => {
        const wasMobile = this.isMobile;
        this.isMobile = result.matches;
        if (!wasMobile && this.isMobile) {
          this.sidenavOpen = false;
        } else if (wasMobile && !this.isMobile) {
          this.sidenavOpen = true;
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  toggleSidenav(): void {
    if (this.isMobile) {
      this.sidenavOpen = !this.sidenavOpen;
    } else {
      this.sidenavCollapsed = !this.sidenavCollapsed;
    }
  }

  onNavItemClick(): void {
    if (this.isMobile) {
      this.sidenavOpen = false;
    }
  }

  hasAccess(roles: string[]): boolean {
    return this.authService.hasAnyRole(roles);
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
