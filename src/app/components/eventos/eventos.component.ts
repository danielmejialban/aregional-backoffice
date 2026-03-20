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
import { EventoService } from '../../services/evento.service';
import { EventoDTO } from '../../models/evento.model';
import { EventoDialogComponent } from './evento-dialog/evento-dialog.component';

@Component({
  selector: 'app-eventos',
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
  templateUrl: './eventos.component.html',
  styleUrls: ['./eventos.component.scss']
})
export class EventosComponent implements OnInit {
  eventos: EventoDTO[] = [];
  displayedColumns = ['id', 'nombre', 'tipo', 'fechas', 'direccion', 'acciones'];
  loading = false;

  constructor(
    private eventoService: EventoService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadEventos();
  }

  loadEventos(): void {
    this.loading = true;
    this.eventoService.getAll().subscribe({
      next: (data) => { this.eventos = data; this.loading = false; },
      error: () => { this.loading = false; this.showError('Error al cargar eventos'); }
    });
  }

  openCreateDialog(): void {
    const ref = this.dialog.open(EventoDialogComponent, {
      width: '620px',
      disableClose: true,
      data: {}
    });
    ref.afterClosed().subscribe(result => {
      if (result) this.createEvento(result);
    });
  }

  openEditDialog(evento: EventoDTO): void {
    const ref = this.dialog.open(EventoDialogComponent, {
      width: '620px',
      disableClose: true,
      data: { evento }
    });
    ref.afterClosed().subscribe(result => {
      if (result) this.updateEvento(result);
    });
  }

  createEvento(evento: EventoDTO): void {
    this.loading = true;
    this.eventoService.create(evento).subscribe({
      next: () => { this.showSuccess('Evento creado correctamente'); this.loadEventos(); },
      error: () => { this.loading = false; this.showError('Error al crear el evento'); }
    });
  }

  updateEvento(evento: EventoDTO): void {
    if (!evento.id) return;
    this.loading = true;
    this.eventoService.update(evento.id, evento).subscribe({
      next: () => { this.showSuccess('Evento actualizado correctamente'); this.loadEventos(); },
      error: () => { this.loading = false; this.showError('Error al actualizar el evento'); }
    });
  }

  deleteEvento(evento: EventoDTO): void {
    if (!confirm(`¿Eliminar el evento "${evento.nombre}"?`)) return;
    this.loading = true;
    this.eventoService.delete(evento.id!).subscribe({
      next: () => { this.showSuccess('Evento eliminado'); this.loadEventos(); },
      error: () => { this.loading = false; this.showError('Error al eliminar el evento'); }
    });
  }

  private showSuccess(msg: string): void {
    this.snackBar.open(msg, 'Cerrar', { duration: 3000, panelClass: ['success-snackbar'] });
  }

  private showError(msg: string): void {
    this.snackBar.open(msg, 'Cerrar', { duration: 4000, panelClass: ['error-snackbar'] });
  }
}

