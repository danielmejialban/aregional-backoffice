import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RouterModule } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '@app/services/auth.service';
import { DepartamentoService } from '@app/services/departamento.service';
import { VoluntarioService } from '@app/services/voluntario.service';
import { EventoService } from '@app/services/evento.service';
import { CheckInService } from '@app/services/check-in.service';
import {TranslatePipe} from '@ngx-translate/core';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    RouterModule,
    TranslatePipe
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
      departamentos: this.departamentoService.getAll().pipe(catchError(() => of([]))),
      voluntarios: this.voluntarioService.getAllPaged(0, 1).pipe(catchError(() => of(null))),
      eventos: this.eventoService.getAll().pipe(catchError(() => of([]))),
      checkIns: this.checkInService.getAll().pipe(catchError(() => of([])))
    }).subscribe({
      next: ({ departamentos, voluntarios, eventos, checkIns }) => {
        this.totalDepartamentos = departamentos.length;
        this.totalVoluntarios = voluntarios?.totalElements ?? 0;
        this.totalEventos = eventos.length;
        this.totalCheckIns = checkIns.length;
        this.loadingStats = false;
      },
      error: () => { this.loadingStats = false; }
    });
  }
}
