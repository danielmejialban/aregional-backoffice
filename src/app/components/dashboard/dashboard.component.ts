import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RouterModule } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { DepartamentoService } from '../../services/departamento.service';
import { VoluntarioService } from '../../services/voluntario.service';
import { EventoService } from '../../services/evento.service';
import { CheckInService } from '../../services/check-in.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    RouterModule
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  currentUser$;
  loadingStats = true;
  totalDepartamentos = 0;
  totalVoluntarios = 0;
  totalEventos = 0;
  totalCheckIns = 0;

  constructor(
    private authService: AuthService,
    private departamentoService: DepartamentoService,
    private voluntarioService: VoluntarioService,
    private eventoService: EventoService,
    private checkInService: CheckInService
  ) {
    this.currentUser$ = this.authService.currentUser$;
  }

  ngOnInit(): void {
    forkJoin({
      departamentos: this.departamentoService.getAll(),
      voluntarios: this.voluntarioService.getAll(),
      eventos: this.eventoService.getAll(),
      checkIns: this.checkInService.getAll()
    }).subscribe({
      next: ({ departamentos, voluntarios, eventos, checkIns }) => {
        this.totalDepartamentos = departamentos.length;
        this.totalVoluntarios = voluntarios.length;
        this.totalEventos = eventos.length;
        this.totalCheckIns = checkIns.length;
        this.loadingStats = false;
      },
      error: () => { this.loadingStats = false; }
    });
  }
}
