import { ChangeDetectorRef, Component, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { PageEvent } from '@angular/material/paginator';
import { forkJoin } from 'rxjs';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { EventoService } from '@app/services/evento.service';
import { EventoVoluntarioService } from '@app/services/evento-voluntario.service';
import { VoluntarioService } from '@app/services/voluntario.service';
import { DepartamentoService } from '@app/services/departamento.service';
import { QrPdfService } from '@app/services/qr-pdf.service';
import { PlantillaExcelService } from '@app/services/plantilla-excel.service';
import { EventoDTO } from '@app/models/evento.model';
import { EventoVoluntarioDTO } from '@app/models/evento-voluntario.model';
import { VoluntarioDTO } from '@app/models/voluntario.model';
import { DepartamentoDTO } from '@app/models/departamento.model';
import { DataTableComponent } from '../../data-table/data-table/data-table.component';
import { ColumnDef, TableActionEvent, ActiveFilters } from '@app/@core';
import { ConfirmDialogComponent } from '../../confirm-dialog/confirm-dialog.component';
import { EventoDialogComponent } from '../evento-dialog/evento-dialog.component';
import { AsignacionDialogComponent } from '../../evento-voluntarios/asignacion-dialog/asignacion-dialog.component';
import { AsignacionMasivaDialogComponent } from '../../evento-voluntarios/asignacion-masiva-dialog/asignacion-masiva-dialog.component';
import { QrPreviewDialogComponent } from '../../evento-voluntarios/qr-preview-dialog/qr-preview-dialog.component';
import { VoluntarioDialogComponent } from '../../voluntarios/voluntarios.component';

interface DiasEvento {
  iso: string;
  label: string;
  esPre: boolean;
}

@Component({
  selector: 'app-evento-detail',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule, MatIconModule, MatCardModule, MatChipsModule,
    MatProgressSpinnerModule, MatSnackBarModule, MatDialogModule,
    MatTooltipModule, MatDividerModule,
    DataTableComponent,
    TranslateModule,
  ],
  templateUrl: './evento-detail.component.html',
  styleUrls: ['./evento-detail.component.scss'],
})
export class EventoDetailComponent implements OnInit {
  @ViewChild('qrCellTpl', { static: false }) qrCellTpl!: TemplateRef<{ $implicit: any }>;
  @ViewChild(DataTableComponent) dataTable?: DataTableComponent;

  evento: EventoDTO | null = null;
  asignaciones: any[] = [];
  voluntarios: VoluntarioDTO[] = [];
  departamentos: DepartamentoDTO[] = [];
  columns: ColumnDef[] = [];
  eventoDias: DiasEvento[] = [];

  loadingEvento = true;
  loadingAsignaciones = false;
  exportandoExcel = false;
  generandoQrIds = new Set<number>();

  totalElements = 0;
  pageSize = 25;
  currentPage = 0;
  private busqueda?: string;
  private filtradoDepartamentoId?: number | null;
  private filtradoAccesoDias?: string[];

  private eventoId!: number;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private eventoService: EventoService,
    private eventoVoluntarioService: EventoVoluntarioService,
    private voluntarioService: VoluntarioService,
    private departamentoService: DepartamentoService,
    private qrPdfService: QrPdfService,
    private plantillaExcelService: PlantillaExcelService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private translate: TranslateService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.eventoId = +this.route.snapshot.paramMap.get('id')!;

    forkJoin({
      evento:        this.eventoService.getById(this.eventoId),
      voluntarios:   this.voluntarioService.getAll(),
      departamentos: this.departamentoService.getAll(),
    }).subscribe({
      next: ({ evento, voluntarios, departamentos }) => {
        this.evento        = evento;
        this.voluntarios   = voluntarios;
        this.departamentos = departamentos;
        this.eventoDias    = this.computeEventoDias(evento);
        this.columns       = this.buildColumns();
        this.loadingEvento = false;
        this.cdr.detectChanges();
        this.loadAsignaciones();
      },
      error: () => {
        this.loadingEvento = false;
        this.showError(this.translate.instant('EventoDetail.Snack.LoadError'));
      },
    });
  }

  private computeEventoDias(evento: EventoDTO): DiasEvento[] {
    if (!evento.fechaInicioEvento || !evento.fechaFinEvento) return [];
    const toLocalIso = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    const inicio = new Date(evento.fechaInicioEvento);
    const fin    = new Date(evento.fechaFinEvento);
    inicio.setHours(0, 0, 0, 0);
    fin.setHours(0, 0, 0, 0);

    const diasPre = evento.diasPreEvento ?? 0;
    const desde   = new Date(inicio);
    desde.setDate(desde.getDate() - diasPre);

    const dias: DiasEvento[] = [];
    for (let cur = new Date(desde); cur <= fin; cur.setDate(cur.getDate() + 1)) {
      const iso   = toLocalIso(cur);
      const esPre = +cur < +inicio;
      const dd    = String(cur.getDate()).padStart(2, '0');
      const mon   = cur.toLocaleString('es', { month: 'short' });
      dias.push({ iso, label: esPre ? `${dd} ${mon} (Pre)` : `${dd} ${mon}`, esPre });
    }
    return dias;
  }

  private transformRow(a: EventoVoluntarioDTO, vol: VoluntarioDTO | undefined): any {
    const diasSet = a.diasAcceso ? new Set(a.diasAcceso.split('|')) : null;
    const row: any = {
      ...a,
      voluntarioDni:         vol?.dni       ?? '',
      voluntarioTelefono:    vol?.telefono  ?? '',
    };
    for (const dia of this.eventoDias) {
      row[`acceso_${dia.iso}`] = diasSet === null ? '✓' : diasSet.has(dia.iso) ? '✓' : '✗';
    }
    return row;
  }

  private buildColumns(): ColumnDef[] {
    const cols: ColumnDef[] = [
      { key: 'id', header: 'ID', type: 'text', width: '60px' },
      {
        key: 'voluntarioNombre',
        header: this.translate.instant('EventoDetail.Columns.Voluntario'),
        type: 'text', filterType: 'text', sortable: true,
      },
      {
        key: 'voluntarioDni',
        header: this.translate.instant('EventoDetail.Columns.Dni'),
        type: 'text', width: '110px', filterType: 'text',
      },
      {
        key: 'voluntarioDepartamentoNombre',
        header: this.translate.instant('EventoDetail.Columns.Departamento'),
        type: 'text',
        filterType: 'select',
        filterOptions: this.departamentos.map(d => d.nombre),
      },
      {
        key: 'voluntarioTelefono',
        header: this.translate.instant('EventoDetail.Columns.Telefono'),
        type: 'text', width: '110px',
      },
    ];

    for (const dia of this.eventoDias) {
      cols.push({
        key: `acceso_${dia.iso}`,
        header: dia.label,
        type: 'badge',
        badgeMap: { '✓': 'dt-badge--success', '✗': 'dt-badge--danger' },
        filterType: 'select',
        filterOptions: ['SI', 'NO'],
        width: '82px',
        exportable: true,
      });
    }

    cols.push(
      {
        key: 'qr',
        header: this.translate.instant('EventoDetail.Columns.Qr'),
        type: 'custom',
        cellTemplate: this.qrCellTpl,
      },
      {
        key: 'acciones',
        header: this.translate.instant('EventoDetail.Columns.Actions'),
        type: 'actions',
        sticky: 'end',
        actions: [
          {
            id: 'viewQr', icon: 'visibility',
            label: this.translate.instant('EventoDetail.Actions.VerQr'), color: 'primary',
            hidden: (row: any) => !row.qrImageBase64,
          },
          {
            id: 'downloadPdf', icon: 'picture_as_pdf',
            label: this.translate.instant('EventoDetail.Actions.DescargarPdf'),
            hidden: (row: any) => !row.qrImageBase64,
          },
          {
            id: 'editVoluntario', icon: 'person_edit',
            label: this.translate.instant('EventoDetail.Actions.EditVoluntario'), color: 'primary',
          },
          {
            id: 'delete', icon: 'delete',
            label: this.translate.instant('EventoDetail.Actions.Delete'), color: 'warn',
          },
        ],
      },
    );

    return cols;
  }

  loadAsignaciones(page = this.currentPage): void {
    this.currentPage = page;
    this.loadingAsignaciones = true;
    this.eventoVoluntarioService.getAllPaged(page, this.pageSize, {
      eventoId:       this.eventoId,
      busqueda:       this.busqueda,
      departamentoId: this.filtradoDepartamentoId,
      accesoDias:     this.filtradoAccesoDias,
    }).subscribe({
      next: (data) => {
        this.asignaciones  = data.content.map(a => {
          const vol = this.voluntarios.find(v => v.id === a.voluntarioId);
          return this.transformRow(a, vol);
        });
        this.totalElements = data.totalElements;
        this.loadingAsignaciones = false;
      },
      error: () => {
        this.loadingAsignaciones = false;
        this.showError(this.translate.instant('EventoDetail.Snack.LoadAsignacionesError'));
      },
    });
  }

  onFilterChange(filters: ActiveFilters): void {
    const nombre = (filters['voluntarioNombre'] as string)?.trim() || undefined;
    const dni    = (filters['voluntarioDni']    as string)?.trim() || undefined;
    this.busqueda             = dni || nombre || undefined;
    const deptoNombre         = filters['voluntarioDepartamentoNombre'] as string | null;
    const depto = deptoNombre ? this.departamentos.find(d => d.nombre === deptoNombre) : null;
    this.filtradoDepartamentoId = depto?.id ?? null;

    const accesoDias: string[] = [];
    for (const dia of this.eventoDias) {
      const valor = filters[`acceso_${dia.iso}`] as string | null;
      if (valor === 'SI' || valor === 'NO') accesoDias.push(`${dia.iso}:${valor}`);
    }
    this.filtradoAccesoDias = accesoDias.length ? accesoDias : undefined;

    this.loadAsignaciones(0);
  }

  onPageChange(event: PageEvent): void {
    this.pageSize = event.pageSize;
    this.loadAsignaciones(event.pageIndex);
  }

  onActionClick(event: TableActionEvent): void {
    const row = event.row as EventoVoluntarioDTO;
    switch (event.action) {
      case 'viewQr':          this.verQr(row);                   break;
      case 'downloadPdf':     this.descargarPdfIndividual(row);  break;
      case 'editVoluntario':  this.editarVoluntario(row);        break;
      case 'delete':          this.confirmDelete(row);           break;
    }
  }

  editarVoluntario(row: EventoVoluntarioDTO): void {
    const voluntario = this.voluntarios.find(v => v.id === row.voluntarioId);
    if (!voluntario) {
      this.showError(this.translate.instant('EventoDetail.Snack.VoluntarioNoEncontrado'));
      return;
    }
    const ref = this.dialog.open(VoluntarioDialogComponent, {
      width: '580px', disableClose: true,
      data: { voluntario, departamentos: this.departamentos },
    });
    ref.afterClosed().subscribe((result: any) => {
      if (!result) return;
      this.voluntarioService.update(voluntario.id!, result).subscribe({
        next: (updated) => {
          const idx = this.voluntarios.findIndex(v => v.id === updated.id);
          if (idx !== -1) this.voluntarios[idx] = updated;
          this.showSuccess(this.translate.instant('EventoDetail.Snack.VoluntarioActualizado'));
          this.loadAsignaciones();
        },
        error: (err) => {
          const msg = err?.error?.message ?? this.translate.instant('EventoDetail.Snack.VoluntarioError');
          this.showError(msg);
        },
      });
    });
  }

  editarEvento(): void {
    const ref = this.dialog.open(EventoDialogComponent, {
      width: '620px', disableClose: true,
      data: { evento: this.evento },
    });
    ref.afterClosed().subscribe((result: EventoDTO) => {
      if (!result) return;
      this.eventoService.update(this.eventoId, result).subscribe({
        next: (updated) => {
          this.evento = updated;
          this.showSuccess(this.translate.instant('EventoDetail.Snack.Updated'));
        },
        error: () => this.showError(this.translate.instant('EventoDetail.Snack.UpdateError')),
      });
    });
  }

  openCreateDialog(): void {
    const ref = this.dialog.open(AsignacionDialogComponent, {
      width: '520px', disableClose: true,
      data: { voluntarios: this.voluntarios, eventos: this.evento ? [this.evento] : [], eventoId: this.eventoId },
    });
    ref.afterClosed().subscribe((result: EventoVoluntarioDTO) => {
      if (result) this.createAsignacion(result);
    });
  }

  openAsignacionMasivaDialog(): void {
    const ref = this.dialog.open(AsignacionMasivaDialogComponent, {
      width: '640px', disableClose: true,
      data: { eventos: this.evento ? [this.evento] : [], departamentos: this.departamentos, eventoId: this.eventoId },
    });
    ref.afterClosed().subscribe((recargar: boolean) => {
      if (recargar) this.loadAsignaciones(0);
    });
  }

  createAsignacion(asignacion: EventoVoluntarioDTO): void {
    this.loadingAsignaciones = true;
    this.eventoVoluntarioService.create(asignacion).subscribe({
      next: () => {
        this.showSuccess(this.translate.instant('EventoDetail.Snack.AsignacionCreada'));
        this.loadAsignaciones(0);
      },
      error: () => {
        this.loadingAsignaciones = false;
        this.showError(this.translate.instant('EventoDetail.Snack.AsignacionError'));
      },
    });
  }

  confirmDelete(asignacion: EventoVoluntarioDTO): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '420px',
      data: {
        title:        this.translate.instant('EventoDetail.ConfirmDelete.Title'),
        message:      this.translate.instant('EventoDetail.ConfirmDelete.Message', { name: asignacion.voluntarioNombre }),
        confirmText:  this.translate.instant('EventoDetail.ConfirmDelete.Confirm'),
        confirmColor: 'warn',
        icon: 'delete',
      },
    });
    ref.afterClosed().subscribe((ok: boolean) => {
      if (ok) this.deleteAsignacion(asignacion);
    });
  }

  deleteAsignacion(asignacion: EventoVoluntarioDTO): void {
    this.loadingAsignaciones = true;
    this.eventoVoluntarioService.delete(asignacion.id!).subscribe({
      next: () => {
        this.showSuccess(this.translate.instant('EventoDetail.Snack.AsignacionEliminada'));
        this.loadAsignaciones();
      },
      error: () => {
        this.loadingAsignaciones = false;
        this.showError(this.translate.instant('EventoDetail.Snack.DeleteError'));
      },
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
          const base64 = (reader.result as string).split(',')[1];
          const idx = this.asignaciones.findIndex(a => a.id === id);
          if (idx !== -1) {
            this.asignaciones[idx] = { ...this.asignaciones[idx], qrImageBase64: base64 };
            this.asignaciones = [...this.asignaciones];
          }
          this.showSuccess(this.translate.instant('EventoDetail.Snack.QrGenerado'));
          this.verQr(this.asignaciones[idx]);
        };
        reader.readAsDataURL(blob);
      },
      error: () => {
        const next = new Set(this.generandoQrIds);
        next.delete(id);
        this.generandoQrIds = next;
        this.showError(this.translate.instant('EventoDetail.Snack.QrError'));
      },
    });
  }

  verQr(asignacion: EventoVoluntarioDTO): void {
    this.dialog.open(QrPreviewDialogComponent, { width: '400px', data: { asignacion } });
  }

  async descargarPdfIndividual(asignacion: EventoVoluntarioDTO): Promise<void> {
    const vol = (asignacion.voluntarioNombre ?? 'voluntario').replace(/\s+/g, '_');
    const ev  = (this.evento?.nombre ?? 'evento').replace(/\s+/g, '_');
    await this.qrPdfService.generarPdf([asignacion], this.voluntarios, `QR_${vol}_${ev}.pdf`);
  }

  async descargarPdfGlobal(): Promise<void> {
    const conQr = this.asignaciones.filter(a => !!a.qrImageBase64);
    if (!conQr.length) {
      this.showError(this.translate.instant('EventoDetail.Snack.NoQr'));
      return;
    }
    const nombre = (this.evento?.nombre ?? 'evento').replace(/\s+/g, '_');
    await this.qrPdfService.generarPdf(conQr, this.voluntarios, `pases_${nombre}.pdf`);
  }

  exportarExcel(): void {
    if (!this.evento) return;
    this.exportandoExcel = true;
    this.eventoVoluntarioService.getByEvento(this.eventoId).subscribe({
      next: (asignaciones) => {
        const rows = asignaciones.map(a => {
          const vol = this.voluntarios.find(v => v.id === a.voluntarioId);
          return this.transformRow(a, vol);
        });
        this.plantillaExcelService
          .exportarAsignacionesEvento(rows, this.voluntarios, this.evento!)
          .finally(() => { this.exportandoExcel = false; });
      },
      error: () => {
        this.exportandoExcel = false;
        this.showError(this.translate.instant('EventoDetail.Snack.ExportError'));
      },
    });
  }

  irAtras(): void {
    this.router.navigate(['/eventos']);
  }

  get tipoColor(): string {
    const map: Record<string, string> = {
      ASAMBLEA: 'primary', FORMACION: 'accent', ESPECIAL: 'warn',
    };
    return map[this.evento?.tipoEvento ?? ''] ?? 'primary';
  }

  private showSuccess(msg: string): void {
    this.snackBar.open(msg, this.translate.instant('Common.Close'), { duration: 3000, panelClass: ['success-snackbar'] });
  }

  private showError(msg: string): void {
    this.snackBar.open(msg, this.translate.instant('Common.Close'), { duration: 4000, panelClass: ['error-snackbar'] });
  }
}
