import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { AuthService } from '../../services/auth.service';
import { EventoVoluntarioService } from '../../services/evento-voluntario.service';
import { EventoService } from '../../services/evento.service';
import { EventoVoluntarioDTO } from '../../models/evento-voluntario.model';
import { EventoDTO } from '../../models/evento.model';
import { LoginResponse } from '../../models/login.model';
import { forkJoin, of } from 'rxjs';
import { switchMap, map } from 'rxjs/operators';

export interface PaseConEvento {
  asignacion: EventoVoluntarioDTO;
  evento?: EventoDTO;
}

@Component({
  selector: 'app-mis-pases',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatChipsModule
  ],
  templateUrl: './mis-pases.component.html',
  styleUrls: ['./mis-pases.component.scss']
})
export class MisPasesComponent implements OnInit {
  currentUser: LoginResponse | null = null;
  pases: PaseConEvento[] = [];
  loading = true;
  error: string | null = null;

  constructor(
    private authService: AuthService,
    private eventoVoluntarioService: EventoVoluntarioService,
    private eventoService: EventoService
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    const voluntarioId = this.currentUser?.voluntario?.id;

    if (!voluntarioId) {
      // ADMIN / COORDINADOR without a linked volunteer: show all assignments
      this.loadAllPases();
      return;
    }

    this.loadPasesForVoluntario(voluntarioId);
  }

  private loadAllPases(): void {
    this.eventoVoluntarioService.getAll().pipe(
      switchMap(asignaciones => this.enrichWithEventos(asignaciones))
    ).subscribe({
      next: pases => { this.pases = pases; this.loading = false; },
      error: () => { this.error = 'No se pudieron cargar los pases.'; this.loading = false; }
    });
  }

  private loadPasesForVoluntario(voluntarioId: number): void {
    // Try the filtered endpoint first; fall back to getAll + client-side filter
    this.eventoVoluntarioService.getAll().pipe(
      map(all => all.filter(a => a.voluntarioId === voluntarioId)),
      switchMap(asignaciones => this.enrichWithEventos(asignaciones))
    ).subscribe({
      next: pases => { this.pases = pases; this.loading = false; },
      error: () => { this.error = 'No se pudieron cargar los pases.'; this.loading = false; }
    });
  }

  private enrichWithEventos(asignaciones: EventoVoluntarioDTO[]) {
    const conQr = asignaciones.filter(a => !!a.qrImageBase64);
    if (conQr.length === 0) return of([]);

    return this.eventoService.getAll().pipe(
      map(eventos => {
        const eventoMap = new Map<number, EventoDTO>(eventos.map(e => [e.id!, e]));
        return conQr.map(a => ({
          asignacion: a,
          evento: eventoMap.get(a.eventoId)
        } as PaseConEvento));
      })
    );
  }

  getQrSrc(base64: string): string {
    return `data:image/png;base64,${base64}`;
  }

  downloadQr(pase: PaseConEvento): void {
    const link = document.createElement('a');
    link.href = this.getQrSrc(pase.asignacion.qrImageBase64!);
    const eventName = (pase.evento?.nombre || pase.asignacion.eventoNombre || 'evento')
      .replace(/\s+/g, '_');
    link.download = `pase_${eventName}.png`;
    link.click();
  }
}

