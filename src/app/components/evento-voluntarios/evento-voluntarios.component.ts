import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { forkJoin } from 'rxjs';
import { EventoVoluntarioService } from '../../services/evento-voluntario.service';
import { EventoService } from '../../services/evento.service';
import { VoluntarioService } from '../../services/voluntario.service';
import { EventoVoluntarioDTO } from '../../models/evento-voluntario.model';
import { EventoDTO } from '../../models/evento.model';
import { VoluntarioDTO } from '../../models/voluntario.model';
import { AsignacionDialogComponent } from './asignacion-dialog/asignacion-dialog.component';

@Component({
  selector: 'app-evento-voluntarios',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatDialogModule,
    MatTooltipModule,
    MatChipsModule
  ],
  templateUrl: './evento-voluntarios.component.html',
  styleUrls: ['./evento-voluntarios.component.scss']
})
export class EventoVoluntariosComponent implements OnInit {
  asignaciones: EventoVoluntarioDTO[] = [];
  voluntarios: VoluntarioDTO[] = [];
  eventos: EventoDTO[] = [];
  displayedColumns = ['id', 'voluntario', 'evento', 'qr', 'acciones'];
  loading = false;

  constructor(
    private eventoVoluntarioService: EventoVoluntarioService,
    private eventoService: EventoService,
    private voluntarioService: VoluntarioService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadAll();
  }

  loadAll(): void {
    this.loading = true;
    forkJoin({
      asignaciones: this.eventoVoluntarioService.getAll(),
      voluntarios: this.voluntarioService.getAll(),
      eventos: this.eventoService.getAll()
    }).subscribe({
      next: ({ asignaciones, voluntarios, eventos }) => {
        this.asignaciones = asignaciones;
        this.voluntarios = voluntarios;
        this.eventos = eventos;
        this.loading = false;
      },
      error: () => { this.loading = false; this.showError('Error al cargar los datos'); }
    });
  }

  openCreateDialog(): void {
    const ref = this.dialog.open(AsignacionDialogComponent, {
      width: '520px',
      disableClose: true,
      data: { voluntarios: this.voluntarios, eventos: this.eventos }
    });
    ref.afterClosed().subscribe(result => {
      if (result) this.createAsignacion(result);
    });
  }

  createAsignacion(asignacion: EventoVoluntarioDTO): void {
    this.loading = true;
    this.eventoVoluntarioService.create(asignacion).subscribe({
      next: () => { this.showSuccess('Asignación creada y QR generado'); this.loadAll(); },
      error: () => { this.loading = false; this.showError('Error al crear la asignación'); }
    });
  }

  deleteAsignacion(asignacion: EventoVoluntarioDTO): void {
    const nombre = `${asignacion.voluntarioNombre} → ${asignacion.eventoNombre}`;
    if (!confirm(`¿Eliminar la asignación "${nombre}"?`)) return;
    this.loading = true;
    this.eventoVoluntarioService.delete(asignacion.id!).subscribe({
      next: () => { this.showSuccess('Asignación eliminada'); this.loadAll(); },
      error: () => { this.loading = false; this.showError('Error al eliminar la asignación'); }
    });
  }

  private showSuccess(msg: string): void {
    this.snackBar.open(msg, 'Cerrar', { duration: 3000, panelClass: ['success-snackbar'] });
  }

  private showError(msg: string): void {
    this.snackBar.open(msg, 'Cerrar', { duration: 4000, panelClass: ['error-snackbar'] });
  }
}

