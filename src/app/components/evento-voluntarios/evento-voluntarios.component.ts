import { Component, DestroyRef, OnInit, TemplateRef, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { PageEvent } from '@angular/material/paginator';
import { Subject, debounceTime, forkJoin } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EventoVoluntarioService, AsignacionFiltros } from '../../services/evento-voluntario.service';
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
import { DataTableComponent } from '../data-table/data-table/data-table.component';
import { ColumnDef, TableActionEvent, ActiveFilters } from '@app/@core';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-evento-voluntarios',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatButtonModule, MatIconModule, MatCardModule,
    MatProgressSpinnerModule, MatSnackBarModule, MatDialogModule,
    MatTooltipModule, MatChipsModule,
    DataTableComponent,
  ],
  templateUrl: './evento-voluntarios.component.html',
  styleUrls: ['./evento-voluntarios.component.scss']
})
export class EventoVoluntariosComponent implements OnInit {
  @ViewChild('qrCellTpl', { static: false }) qrCellTpl!: TemplateRef<{ $implicit: any }>;

  asignaciones: any[] = [];
  voluntarios: VoluntarioDTO[] = [];
  eventos: EventoDTO[] = [];
  departamentos: DepartamentoDTO[] = [];
  columns: ColumnDef[] = [];
  loading = false;
  generandoQrIds = new Set<number>();

  totalElements = 0;
  pageSize = 10;
  currentPage = 0;

  private currentFiltros: AsignacionFiltros = {};
  private readonly destroyRef = inject(DestroyRef);

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
    forkJoin({
      voluntarios: this.voluntarioService.getAll(),
      eventos: this.eventoService.getAll(),
      departamentos: this.departamentoService.getAll(),
    }).subscribe({
      next: ({ voluntarios, eventos, departamentos }) => {
        this.voluntarios  = voluntarios;
        this.eventos      = eventos;
        this.departamentos = departamentos;
      },
      error: () => this.showError('Error al cargar datos de apoyo'),
    });
    this.loadAsignaciones();
  }

  ngAfterViewInit(): void {
    this.columns = this.buildColumns();
  }

  private buildColumns(): ColumnDef[] {
    return [
      { key: 'id', header: 'ID', type: 'text', width: '60px' },
      { key: 'voluntarioNombre', header: 'Voluntario', type: 'text', filterType: 'text' },
      { key: 'eventoNombre', header: 'Evento', type: 'text', filterType: 'text' },
      {
        key: 'qr', header: 'QR', type: 'custom',
        cellTemplate: this.qrCellTpl,
      },
      {
        key: 'acciones', header: 'Acciones', type: 'actions', sticky: 'end',
        actions: [
          {
            id: 'viewQr', icon: 'visibility', label: 'Ver QR', color: 'primary',
            hidden: (row) => !row.qrImageBase64,
          },
          {
            id: 'downloadPdf', icon: 'picture_as_pdf', label: 'Descargar PDF',
            hidden: (row) => !row.qrImageBase64,
          },
          { id: 'delete', icon: 'delete', label: 'Eliminar', color: 'warn' },
        ],
      },
    ];
  }

  loadAsignaciones(page = this.currentPage): void {
    this.currentPage = page;
    this.loading = true;
    this.eventoVoluntarioService.getAllPaged(page, this.pageSize, this.currentFiltros).subscribe({
      next: (data) => {
        this.asignaciones = data.content;
        this.totalElements = data.totalElements;
        this.loading = false;
      },
      error: () => { this.loading = false; this.showError('Error al cargar asignaciones'); },
    });
  }

  onFilterChange(filters: ActiveFilters): void {
    const busqueda  = (filters['voluntarioNombre'] as string) || undefined;
    const eventoNom = (filters['eventoNombre']     as string) || undefined;
    const evento    = eventoNom ? this.eventos.find(e => e.nombre === eventoNom) : null;

    this.currentFiltros = {
      busqueda,
      eventoId: evento?.id ?? null,
    };
    this.loadAsignaciones(0);
  }

  onPageChange(event: PageEvent): void {
    this.pageSize = event.pageSize;
    this.loadAsignaciones(event.pageIndex);
  }

  onActionClick(event: TableActionEvent): void {
    const row = event.row as EventoVoluntarioDTO;
    switch (event.action) {
      case 'viewQr':       this.verQr(row);                  break;
      case 'downloadPdf':  this.descargarPdfIndividual(row); break;
      case 'delete':       this.confirmDeleteAsignacion(row); break;
    }
  }

  openCreateDialog(): void {
    const ref = this.dialog.open(AsignacionDialogComponent, {
      width: '520px', disableClose: true,
      data: { voluntarios: this.voluntarios, eventos: this.eventos },
    });
    ref.afterClosed().subscribe(result => { if (result) this.createAsignacion(result); });
  }

  openAsignacionMasivaDialog(): void {
    const ref = this.dialog.open(AsignacionMasivaDialogComponent, {
      width: '640px', disableClose: true,
      data: { eventos: this.eventos, departamentos: this.departamentos },
    });
    ref.afterClosed().subscribe((recargar: boolean) => {
      if (recargar) this.loadAsignaciones(0);
    });
  }

  createAsignacion(asignacion: EventoVoluntarioDTO): void {
    this.loading = true;
    this.eventoVoluntarioService.create(asignacion).subscribe({
      next: () => { this.showSuccess('Asignación creada'); this.loadAsignaciones(0); },
      error: () => { this.loading = false; this.showError('Error al crear la asignación'); },
    });
  }

  generarQr(asignacion: EventoVoluntarioDTO): void {
    const id = asignacion.id!;
    this.generandoQrIds = new Set(this.generandoQrIds).add(id);
    this.eventoVoluntarioService.getQrImage(id).subscribe({
      next: (blob) => {
        const reader = new FileReader();
        reader.onload = () => {
          const next = new Set(this.generandoQrIds);
          next.delete(id);
          this.generandoQrIds = next;
          const dataUrl = reader.result as string;
          const base64  = dataUrl.split(',')[1];
          const idx = this.asignaciones.findIndex(a => a.id === id);
          if (idx !== -1) {
            this.asignaciones[idx] = { ...this.asignaciones[idx], qrImageBase64: base64 };
            this.asignaciones = [...this.asignaciones];
          }
          this.showSuccess('QR generado correctamente');
          this.verQr(this.asignaciones[idx]);
        };
        reader.readAsDataURL(blob);
      },
      error: () => {
        const next = new Set(this.generandoQrIds);
        next.delete(id);
        this.generandoQrIds = next;
        this.showError('Error al obtener el QR del servidor');
      },
    });
  }

  verQr(asignacion: EventoVoluntarioDTO): void {
    this.dialog.open(QrPreviewDialogComponent, { width: '400px', data: { asignacion } });
  }

  confirmDeleteAsignacion(asignacion: EventoVoluntarioDTO): void {
    const nombre = `${asignacion.voluntarioNombre} → ${asignacion.eventoNombre}`;
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '420px',
      data: {
        title: 'Eliminar asignación',
        message: `¿Estás seguro de que quieres eliminar la asignación "${nombre}"?`,
        confirmText: 'Eliminar',
        confirmColor: 'warn',
        icon: 'delete',
      },
    });
    ref.afterClosed().subscribe((ok: boolean) => { if (ok) this.deleteAsignacion(asignacion); });
  }

  deleteAsignacion(asignacion: EventoVoluntarioDTO): void {
    this.loading = true;
    this.eventoVoluntarioService.delete(asignacion.id!).subscribe({
      next: () => { this.showSuccess('Asignación eliminada'); this.loadAsignaciones(); },
      error: () => { this.loading = false; this.showError('Error al eliminar la asignación'); },
    });
  }

  descargarPdfIndividual(asignacion: EventoVoluntarioDTO): void {
    const vol = (asignacion.voluntarioNombre ?? 'voluntario').replace(/\s+/g, '_');
    const ev  = (asignacion.eventoNombre    ?? 'evento').replace(/\s+/g, '_');
    this.qrPdfService.generarPdf([asignacion], `QR_${vol}_${ev}.pdf`);
  }

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
