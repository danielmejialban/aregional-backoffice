import { ChangeDetectorRef, Component, DestroyRef, OnInit, TemplateRef, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
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
import {  forkJoin } from 'rxjs';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { EventoVoluntarioService, AsignacionFiltros } from '@app/services/evento-voluntario.service';
import { EventoService } from '@app/services/evento.service';
import { VoluntarioService } from '@app/services/voluntario.service';
import { DepartamentoService } from '@app/services/departamento.service';
import { EventoVoluntarioDTO } from '@app/models/evento-voluntario.model';
import { EventoDTO } from '@app/models/evento.model';
import { VoluntarioDTO } from '@app/models/voluntario.model';
import { DepartamentoDTO } from '@app/models/departamento.model';
import { AsignacionDialogComponent } from './asignacion-dialog/asignacion-dialog.component';
import { QrPreviewDialogComponent } from './qr-preview-dialog/qr-preview-dialog.component';
import { AsignacionMasivaDialogComponent } from './asignacion-masiva-dialog/asignacion-masiva-dialog.component';
import { QrPdfService } from '@app/services/qr-pdf.service';
import { PlantillaExcelService } from '@app/services/plantilla-excel.service';
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
    TranslateModule,
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
  exportandoExcel = false;
  generandoQrIds = new Set<number>();

  totalElements = 0;
  pageSize = 10;
  currentPage = 0;

  eventoActual: EventoDTO | null = null;
  private eventoIdDeRuta: number | null = null;
  private currentFiltros: AsignacionFiltros = {};

  constructor(
    private eventoVoluntarioService: EventoVoluntarioService,
    private eventoService: EventoService,
    private voluntarioService: VoluntarioService,
    private departamentoService: DepartamentoService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private qrPdfService: QrPdfService,
    private plantillaExcelService: PlantillaExcelService,
    private translate: TranslateService,
    private cdr: ChangeDetectorRef,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  ngOnInit(): void {
    const param = this.route.snapshot.queryParamMap.get('eventoId');
    this.eventoIdDeRuta = param ? +param : null;
    if (this.eventoIdDeRuta) {
      this.currentFiltros = { eventoId: this.eventoIdDeRuta };
    }

    forkJoin({
      voluntarios: this.voluntarioService.getAll(),
      eventos: this.eventoService.getAll(),
      departamentos: this.departamentoService.getAll(),
    }).subscribe({
      next: ({ voluntarios, eventos, departamentos }) => {
        this.voluntarios   = voluntarios;
        this.eventos       = eventos;
        this.departamentos = departamentos;
        if (this.eventoIdDeRuta) {
          this.eventoActual = eventos.find(e => e.id === this.eventoIdDeRuta) ?? null;
          this.columns = this.buildColumns();
          this.cdr.detectChanges();
        }
      },
      error: () => this.showError(this.translate.instant('EventoVoluntarios.Snack.LoadSupportError')),
    });
    this.loadAsignaciones();
  }

  ngAfterViewInit(): void {
    this.columns = this.buildColumns();
    this.cdr.detectChanges();
  }

  private buildColumns(): ColumnDef[] {
    const cols: ColumnDef[] = [
      { key: 'id', header: this.translate.instant('EventoVoluntarios.Columns.Id'), type: 'text', width: '60px' },
      { key: 'voluntarioNombre', header: this.translate.instant('EventoVoluntarios.Columns.Voluntario'), type: 'text', filterType: 'text' },
    ];

    if (!this.eventoActual) {
      cols.push({ key: 'eventoNombre', header: this.translate.instant('EventoVoluntarios.Columns.Evento'), type: 'text', filterType: 'text' });
    }

    cols.push(
      {
        key: 'qr', header: this.translate.instant('EventoVoluntarios.Columns.Qr'), type: 'custom',
        cellTemplate: this.qrCellTpl,
      },
      {
        key: 'acciones', header: this.translate.instant('EventoVoluntarios.Columns.Actions'), type: 'actions', sticky: 'end',
        actions: [
          {
            id: 'viewQr', icon: 'visibility', label: this.translate.instant('EventoVoluntarios.Actions.VerQr'), color: 'primary',
            hidden: (row: any) => !row.qrImageBase64,
          },
          {
            id: 'downloadPdf', icon: 'picture_as_pdf', label: this.translate.instant('EventoVoluntarios.Actions.DescargarPdf'),
            hidden: (row: any) => !row.qrImageBase64,
          },
          { id: 'delete', icon: 'delete', label: this.translate.instant('EventoVoluntarios.Actions.Delete'), color: 'warn' },
        ],
      },
    );

    return cols;
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
      error: () => { this.loading = false; this.showError(this.translate.instant('EventoVoluntarios.Snack.LoadError')); },
    });
  }

  onFilterChange(filters: ActiveFilters): void {
    const busqueda = (filters['voluntarioNombre'] as string) || undefined;

    if (this.eventoActual) {
      this.currentFiltros = { busqueda, eventoId: this.eventoActual.id };
    } else {
      const eventoNom = (filters['eventoNombre'] as string) || undefined;
      const evento    = eventoNom ? this.eventos.find(e => e.nombre === eventoNom) : null;
      this.currentFiltros = { busqueda, eventoId: evento?.id ?? null };
    }
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
      data: { voluntarios: this.voluntarios, eventos: this.eventos, eventoId: this.eventoActual?.id },
    });
    ref.afterClosed().subscribe(result => { if (result) this.createAsignacion(result); });
  }

  openAsignacionMasivaDialog(): void {
    const ref = this.dialog.open(AsignacionMasivaDialogComponent, {
      width: '640px', disableClose: true,
      data: { eventos: this.eventos, departamentos: this.departamentos, eventoId: this.eventoActual?.id },
    });
    ref.afterClosed().subscribe((recargar: boolean) => {
      if (recargar) this.loadAsignaciones(0);
    });
  }

  irAtras(): void {
    this.router.navigate(['/eventos']);
  }

  createAsignacion(asignacion: EventoVoluntarioDTO): void {
    this.loading = true;
    this.eventoVoluntarioService.create(asignacion).subscribe({
      next: () => { this.showSuccess(this.translate.instant('EventoVoluntarios.Snack.Created')); this.loadAsignaciones(0); },
      error: () => { this.loading = false; this.showError(this.translate.instant('EventoVoluntarios.Snack.CreateError')); },
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
          this.showSuccess(this.translate.instant('EventoVoluntarios.Snack.QrGenerated'));
          this.verQr(this.asignaciones[idx]);
        };
        reader.readAsDataURL(blob);
      },
      error: () => {
        const next = new Set(this.generandoQrIds);
        next.delete(id);
        this.generandoQrIds = next;
        this.showError(this.translate.instant('EventoVoluntarios.Snack.QrError'));
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
        title: this.translate.instant('EventoVoluntarios.ConfirmDelete.Title'),
        message: this.translate.instant('EventoVoluntarios.ConfirmDelete.Message', { name: nombre }),
        confirmText: this.translate.instant('EventoVoluntarios.ConfirmDelete.Confirm'),
        confirmColor: 'warn',
        icon: 'delete',
      },
    });
    ref.afterClosed().subscribe((ok: boolean) => { if (ok) this.deleteAsignacion(asignacion); });
  }

  deleteAsignacion(asignacion: EventoVoluntarioDTO): void {
    this.loading = true;
    this.eventoVoluntarioService.delete(asignacion.id!).subscribe({
      next: () => { this.showSuccess(this.translate.instant('EventoVoluntarios.Snack.Deleted')); this.loadAsignaciones(); },
      error: () => { this.loading = false; this.showError(this.translate.instant('EventoVoluntarios.Snack.DeleteError')); },
    });
  }

  descargarPdfIndividual(asignacion: EventoVoluntarioDTO): void {
    const vol = (asignacion.voluntarioNombre ?? 'voluntario').replace(/\s+/g, '_');
    const ev  = (asignacion.eventoNombre    ?? 'evento').replace(/\s+/g, '_');
    this.qrPdfService.generarPdf([asignacion], this.voluntarios, `QR_${vol}_${ev}.pdf`);
  }

  exportarExcel(): void {
    this.exportandoExcel = true;
    this.eventoVoluntarioService.getAllPaged(0, 5000, this.currentFiltros).subscribe({
      next: (data) => {
        const evento = this.currentFiltros.eventoId != null
          ? this.eventos.find(e => e.id === this.currentFiltros.eventoId)
          : undefined;
        this.plantillaExcelService
          .exportarAsignacionesEvento(data.content, this.voluntarios, evento)
          .finally(() => { this.exportandoExcel = false; });
      },
      error: () => {
        this.exportandoExcel = false;
        this.showError(this.translate.instant('EventoVoluntarios.Snack.LoadError'));
      },
    });
  }

  descargarPdfGlobal(): void {
    const conQr = this.asignaciones.filter(a => !!a.qrImageBase64);
    if (!conQr.length) {
      this.showError(this.translate.instant('EventoVoluntarios.Snack.NoQr'));
      return;
    }
    this.qrPdfService.generarPdf(conQr, this.voluntarios, 'pases_todos.pdf');
  }

  private showSuccess(msg: string): void {
    this.snackBar.open(msg, this.translate.instant('Common.Close'), { duration: 3000, panelClass: ['success-snackbar'] });
  }

  private showError(msg: string): void {
    this.snackBar.open(msg, this.translate.instant('Common.Close'), { duration: 4000, panelClass: ['error-snackbar'] });
  }
}
