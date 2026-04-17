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
import { DepartamentoService } from '../../services/departamento.service';
import { EventoVoluntarioDTO } from '../../models/evento-voluntario.model';
import { EventoDTO } from '../../models/evento.model';
import { VoluntarioDTO } from '../../models/voluntario.model';
import { DepartamentoDTO } from '../../models/departamento.model';
import { AsignacionDialogComponent } from './asignacion-dialog/asignacion-dialog.component';
import { QrPreviewDialogComponent } from './qr-preview-dialog/qr-preview-dialog.component';
import { AsignacionMasivaDialogComponent } from './asignacion-masiva-dialog/asignacion-masiva-dialog.component';
import { QrPdfService } from '../../services/qr-pdf.service';

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
  departamentos: DepartamentoDTO[] = [];
  displayedColumns = ['id', 'voluntario', 'evento', 'qr', 'acciones'];
  loading = false;
  /** IDs de asignaciones cuyo QR se está generando en este momento */
  generandoQrIds = new Set<number>();

  constructor(
    private eventoVoluntarioService: EventoVoluntarioService,
    private eventoService: EventoService,
    private voluntarioService: VoluntarioService,
    private departamentoService: DepartamentoService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private qrPdfService: QrPdfService
  ) {}

  ngOnInit(): void {
    this.loadAll();
  }

  loadAll(): void {
    this.loading = true;
    forkJoin({
      asignaciones: this.eventoVoluntarioService.getAll(),
      voluntarios: this.voluntarioService.getAll(),
      eventos: this.eventoService.getAll(),
      departamentos: this.departamentoService.getAll()
    }).subscribe({
      next: ({ asignaciones, voluntarios, eventos, departamentos }) => {
        this.asignaciones = asignaciones;
        this.voluntarios = voluntarios;
        this.eventos = eventos;
        this.departamentos = departamentos;
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

  openAsignacionMasivaDialog(): void {
    const ref = this.dialog.open(AsignacionMasivaDialogComponent, {
      width: '640px',
      disableClose: true,
      data: { eventos: this.eventos, departamentos: this.departamentos }
    });
    ref.afterClosed().subscribe((recargar: boolean) => {
      if (recargar) this.loadAll();
    });
  }

  createAsignacion(asignacion: EventoVoluntarioDTO): void {
    this.loading = true;
    this.eventoVoluntarioService.create(asignacion).subscribe({
      next: () => { this.showSuccess('Asignación creada y QR generado'); this.loadAll(); },
      error: () => { this.loading = false; this.showError('Error al crear la asignación'); }
    });
  }

  generarQr(asignacion: EventoVoluntarioDTO): void {
    const id = asignacion.id!;
    this.generandoQrIds.add(id);
    this.eventoVoluntarioService.getQrImage(id).subscribe({
      next: (blob) => {
        // Convertir el Blob PNG devuelto por el backend a base64
        const reader = new FileReader();
        reader.onload = () => {
          this.generandoQrIds.delete(id);
          // reader.result es "data:image/png;base64,XXXX" — extraemos solo la parte base64
          const dataUrl = reader.result as string;
          const base64 = dataUrl.split(',')[1];
          // Actualizar la fila en memoria sin recargar toda la tabla
          const idx = this.asignaciones.findIndex(a => a.id === id);
          if (idx !== -1) {
            this.asignaciones[idx] = { ...this.asignaciones[idx], qrImageBase64: base64 };
            this.asignaciones = [...this.asignaciones];
          }
          this.showSuccess('QR generado correctamente');
          // Abrir el diálogo de vista previa automáticamente
          this.verQr(this.asignaciones[idx]);
        };
        reader.readAsDataURL(blob);
      },
      error: () => {
        this.generandoQrIds.delete(id);
        this.showError('Error al obtener el QR del servidor');
      }
    });
  }

  verQr(asignacion: EventoVoluntarioDTO): void {
    this.dialog.open(QrPreviewDialogComponent, {
      width: '400px',
      data: { asignacion }
    });
  }

  deleteAsignacion(asignacion: EventoVoluntarioDTO): void {
    const nombre = `${asignacion.voluntarioNombre} → ${asignacion.eventoNombre}`;
    if (!confirm(`¿Eliminar la asignación "${nombre}"?`)) return;
    this.loading = true;
    this.eventoVoluntarioService.delete(asignacion.id!).subscribe({
      next: () => {
        this.showSuccess('Asignación eliminada');
        this.loadAll();
      },
      error: () => { this.loading = false; this.showError('Error al eliminar la asignación'); }
    });
  }

  /** Descarga el PDF con la tarjeta QR de una única asignación */
  descargarPdfIndividual(asignacion: EventoVoluntarioDTO): void {
    const vol = (asignacion.voluntarioNombre ?? 'voluntario').replace(/\s+/g, '_');
    const ev  = (asignacion.eventoNombre ?? 'evento').replace(/\s+/g, '_');
    this.qrPdfService.generarPdf([asignacion], `QR_${vol}_${ev}.pdf`);
  }

  /** Descarga el PDF con todas las tarjetas QR que ya están generadas */
  descargarPdfGlobal(): void {
    const conQr = this.asignaciones.filter(a => !!a.qrImageBase64);
    if (!conQr.length) {
      this.showError('No hay ningún QR generado aún. Genera los QR primero.');
      return;
    }
    this.qrPdfService.generarPdf(conQr, 'tarjetas_qr_todas.pdf');
  }

  private showSuccess(msg: string): void {
    this.snackBar.open(msg, 'Cerrar', { duration: 3000, panelClass: ['success-snackbar'] });
  }

  private showError(msg: string): void {
    this.snackBar.open(msg, 'Cerrar', { duration: 4000, panelClass: ['error-snackbar'] });
  }
}

