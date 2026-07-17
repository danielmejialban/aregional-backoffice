import { Component, DestroyRef, ElementRef, Inject, OnInit, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTableModule } from '@angular/material/table';
import { PageEvent } from '@angular/material/paginator';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { VoluntarioService, VoluntarioFiltros } from '@app/services/voluntario.service';
import { VoluntarioDTO } from '@app/models/voluntario.model';
import { DepartamentoService } from '@app/services/departamento.service';
import { DepartamentoDTO } from '@app/models/departamento.model';
import { CargaMasivaResultadoDTO, FilaResultadoDTO } from '@app/models/carga-masiva-resultado.model';
import { PlantillaExcelService } from '@app/services/plantilla-excel.service';
import { DataTableComponent } from '../data-table/data-table/data-table.component';
import { ColumnDef, TableActionEvent, ActiveFilters } from '@app/@core';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';

export interface VoluntarioDialogData {
  voluntario?: VoluntarioDTO;
  departamentos: DepartamentoDTO[];
}

// ── Diálogo create/edit voluntario ─────────────────────────────────────────
@Component({
  selector: 'app-voluntario-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule,
    MatIconModule, MatSelectModule, MatSlideToggleModule,
    TranslateModule,
  ],
  template: `
    <h2 mat-dialog-title>{{ (data.voluntario?.id ? 'Voluntarios.Dialog.TitleEdit' : 'Voluntarios.Dialog.TitleNew') | translate }}</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="form-grid">
        <div class="row-2">
          <mat-form-field appearance="outline">
            <mat-label>{{ 'Voluntarios.Dialog.NombreLabel' | translate }}</mat-label>
            <input matInput formControlName="nombre" required>
            @if (form.get('nombre')?.hasError('required')) {
              <mat-error>{{ 'Voluntarios.Dialog.Required' | translate }}</mat-error>
            }
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>{{ 'Voluntarios.Dialog.Apellido1Label' | translate }}</mat-label>
            <input matInput formControlName="apellido1" required>
            @if (form.get('apellido1')?.hasError('required')) {
              <mat-error>{{ 'Voluntarios.Dialog.Required' | translate }}</mat-error>
            }
          </mat-form-field>
        </div>
        <div class="row-2">
          <mat-form-field appearance="outline">
            <mat-label>{{ 'Voluntarios.Dialog.Apellido2Label' | translate }}</mat-label>
            <input matInput formControlName="apellido2">
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>{{ 'Voluntarios.Dialog.DniLabel' | translate }}</mat-label>
            <input matInput formControlName="dni" required [placeholder]="'Voluntarios.Dialog.DniPlaceholder' | translate">
            @if (form.get('dni')?.hasError('required')) {
              <mat-error>{{ 'Voluntarios.Dialog.Required' | translate }}</mat-error>
            } @else if (form.get('dni')?.hasError('pattern')) {
              <mat-error>{{ 'Voluntarios.Dialog.DniInvalid' | translate }}</mat-error>
            }
          </mat-form-field>
        </div>
        <div class="row-2">
          <mat-form-field appearance="outline">
            <mat-label>{{ 'Voluntarios.Dialog.TelefonoLabel' | translate }}</mat-label>
            <input matInput formControlName="telefono">
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>{{ 'Voluntarios.Dialog.EmailLabel' | translate }}</mat-label>
            <input matInput formControlName="email" type="email">
            @if (form.get('email')?.hasError('email')) {
              <mat-error>{{ 'Voluntarios.Dialog.EmailInvalid' | translate }}</mat-error>
            }
          </mat-form-field>
        </div>
        <div class="row-2">
          <mat-form-field appearance="outline">
            <mat-label>{{ 'Voluntarios.Dialog.CongregacionLabel' | translate }}</mat-label>
            <input matInput formControlName="congregacion">
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>{{ 'Voluntarios.Dialog.CircuitoLabel' | translate }}</mat-label>
            <input matInput formControlName="circuito">
          </mat-form-field>
        </div>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>{{ 'Voluntarios.Dialog.CorreoJwLabel' | translate }}</mat-label>
          <input matInput formControlName="correoJw">
        </mat-form-field>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>{{ 'Voluntarios.Dialog.DepartamentoLabel' | translate }}</mat-label>
          <mat-select formControlName="departamentoIds" [multiple]="true" required>
            @for (d of data.departamentos; track d.id) {
              <mat-option [value]="d.id">{{ d.nombre }}</mat-option>
            }
          </mat-select>
          @if (form.get('departamentoIds')?.hasError('required')) {
            <mat-error>{{ 'Voluntarios.Dialog.Required' | translate }}</mat-error>
          }
        </mat-form-field>
        <div class="toggles-row">
          <mat-slide-toggle formControlName="activo" color="primary">{{ 'Voluntarios.Dialog.ActivoLabel' | translate }}</mat-slide-toggle>
        </div>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="dialogRef.close()">{{ 'Common.Cancel' | translate }}</button>
      <button mat-raised-button color="primary" (click)="onSave()" [disabled]="!form.valid">
        <mat-icon>save</mat-icon> {{ (data.voluntario?.id ? 'Common.Save' : 'Common.Create') | translate }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .form-grid { display: flex; flex-direction: column; gap: 4px; min-width: 480px; padding-top: 4px; }
    .row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .full-width { width: 100%; }
    .toggles-row { display: flex; gap: 24px; padding: 8px 0 12px; }
  `]
})
export class VoluntarioDialogComponent implements OnInit {
  form!: FormGroup;

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<VoluntarioDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: VoluntarioDialogData
  ) {}

  ngOnInit(): void {
    const v = this.data.voluntario;
    const dniEsTemporal = v?.dniTemporal || v?.dniInvalid
      || v?.dni?.startsWith('TEMP-') || v?.dni?.startsWith('INVD-');
    const dniValidators = dniEsTemporal
      ? [Validators.required]
      : [Validators.required, Validators.pattern(/^[0-9]{8}[A-Z]$|^[XYZ][0-9]{7}[A-Z]$/)];
    this.form = this.fb.group({
      nombre:         [v?.nombre      || '', Validators.required],
      apellido1:      [v?.apellido1   || '', Validators.required],
      apellido2:      [v?.apellido2   || ''],
      dni:            [v?.dni         || '', dniValidators],
      telefono:       [v?.telefono    || ''],
      email:          [v?.email       || '', Validators.email],
      congregacion:   [v?.congregacion || ''],
      circuito:       [v?.circuito    || ''],
      correoJw:       [v?.correoJw    || ''],
      departamentoIds: [v?.departamentoIds ?? [], Validators.required],
      activo:         [v?.activo      ?? true],
    });
  }

  onSave(): void {
    if (!this.form.valid) return;
    const val = this.form.value;
    const dto: VoluntarioDTO = {
      id:             this.data.voluntario?.id,
      nombre:         val.nombre.trim(),
      apellido1:      val.apellido1.trim(),
      apellido2:      val.apellido2?.trim() || undefined,
      dni:            val.dni.toUpperCase().trim(),
      telefono:       val.telefono?.trim()     || undefined,
      email:          val.email?.trim()        || undefined,
      congregacion:   val.congregacion?.trim() || undefined,
      circuito:       val.circuito?.trim()     || undefined,
      correoJw:       val.correoJw?.trim()     || undefined,
      departamentoIds: val.departamentoIds ?? [],
      activo:         val.activo,
    };
    this.dialogRef.close(dto);
  }
}

// ── Diálogo de resultado carga masiva ─────────────────────────────────────────
@Component({
  selector: 'app-carga-masiva-resultado-dialog',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatTableModule, MatChipsModule, MatDialogModule, MatTabsModule, MatIconModule, TranslateModule],
  template: `
    <h2 mat-dialog-title>{{ 'Voluntarios.CargaMasivaDialog.Title' | translate }}</h2>
    <mat-dialog-content>
      <div class="resumen">
        <span class="chip total">📋 {{ 'Voluntarios.CargaMasivaDialog.Total' | translate:{ count: data.totalFilas } }}</span>
        <span class="chip creado">✔ {{ 'Voluntarios.CargaMasivaDialog.Created' | translate:{ count: data.creados } }}</span>
        <span class="chip omitido">⚠ {{ 'Voluntarios.CargaMasivaDialog.Skipped' | translate:{ count: data.omitidos } }}</span>
        <span class="chip error">✖ {{ 'Voluntarios.CargaMasivaDialog.Errors' | translate:{ count: data.errores } }}</span>
      </div>
      <mat-tab-group>
        <mat-tab [label]="'Voluntarios.CargaMasivaDialog.TabErrors' | translate:{ count: errores.length }">
          <ng-container *ngTemplateOutlet="tablaDetalle; context: { $implicit: errores }"></ng-container>
        </mat-tab>
        <mat-tab [label]="'Voluntarios.CargaMasivaDialog.TabSkipped' | translate:{ count: omitidos.length }">
          <ng-container *ngTemplateOutlet="tablaDetalle; context: { $implicit: omitidos }"></ng-container>
        </mat-tab>
        <mat-tab [label]="'Voluntarios.CargaMasivaDialog.TabCreated' | translate:{ count: creados.length }">
          <ng-container *ngTemplateOutlet="tablaDetalle; context: { $implicit: creados }"></ng-container>
        </mat-tab>
      </mat-tab-group>
      <ng-template #tablaDetalle let-filas>
        <p *ngIf="filas.length === 0" class="empty-tab">{{ 'Voluntarios.CargaMasivaDialog.Empty' | translate }}</p>
        <table mat-table [dataSource]="filas" class="detalle-table" *ngIf="filas.length > 0">
          <ng-container matColumnDef="fila">
            <th mat-header-cell *matHeaderCellDef>{{ 'Voluntarios.CargaMasivaDialog.ColFila' | translate }}</th>
            <td mat-cell *matCellDef="let r">{{ r.fila }}</td>
          </ng-container>
          <ng-container matColumnDef="estado">
            <th mat-header-cell *matHeaderCellDef>{{ 'Voluntarios.CargaMasivaDialog.ColEstado' | translate }}</th>
            <td mat-cell *matCellDef="let r">
              <span [class]="'chip ' + r.estado.toLowerCase()">{{ r.estado }}</span>
            </td>
          </ng-container>
          <ng-container matColumnDef="dni">
            <th mat-header-cell *matHeaderCellDef>{{ 'Voluntarios.CargaMasivaDialog.ColDni' | translate }}</th>
            <td mat-cell *matCellDef="let r">{{ r.dni || '-' }}</td>
          </ng-container>
          <ng-container matColumnDef="mensaje">
            <th mat-header-cell *matHeaderCellDef>{{ 'Voluntarios.CargaMasivaDialog.ColMensaje' | translate }}</th>
            <td mat-cell *matCellDef="let r">{{ r.mensaje }}</td>
          </ng-container>
          <tr mat-header-row *matHeaderRowDef="cols"></tr>
          <tr mat-row *matRowDef="let row; columns: cols;"></tr>
        </table>
      </ng-template>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-raised-button color="primary" (click)="dialogRef.close()">{{ 'Common.Close' | translate }}</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .resumen { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 16px; }
    .chip { padding: 4px 12px; border-radius: 16px; font-weight: 600; font-size: 13px; }
    .chip.creado  { background: #e8f5e9; color: #2e7d32; }
    .chip.omitido { background: #fff8e1; color: #f57f17; }
    .chip.error   { background: #ffebee; color: #c62828; }
    .chip.total   { background: #e3f2fd; color: #1565c0; }
    .detalle-table { width: 100%; margin-top: 8px; }
    .empty-tab { color: #999; font-style: italic; padding: 16px 0; }
  `]
})
export class CargaMasivaResultadoDialogComponent {
  cols = ['fila', 'estado', 'dni', 'mensaje'];
  creados:  FilaResultadoDTO[];
  omitidos: FilaResultadoDTO[];
  errores:  FilaResultadoDTO[];

  constructor(
    public dialogRef: MatDialogRef<CargaMasivaResultadoDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: CargaMasivaResultadoDTO
  ) {
    this.creados  = data.detalle.filter(f => f.estado === 'CREADO');
    this.omitidos = data.detalle.filter(f => f.estado === 'OMITIDO');
    this.errores  = data.detalle.filter(f => f.estado === 'ERROR');
  }
}

// ── Componente principal ───────────────────────────────────────────────────
@Component({
  selector: 'app-voluntarios',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatButtonModule, MatIconModule, MatCardModule,
    MatSnackBarModule, MatDialogModule, MatTooltipModule,
    DataTableComponent,
    TranslateModule,
  ],
  templateUrl: './voluntarios.component.html',
  styleUrls: ['./voluntarios.component.scss']
})
export class VoluntariosComponent implements OnInit {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  voluntarios: any[] = [];
  columns: ColumnDef[] = [];
  loading = false;
  subiendoArchivo = false;
  exportandoExcel = false;

  totalElements = 0;
  pageSize = 10;
  currentPage = 0;

  departamentos: DepartamentoDTO[] = [];
  private currentFiltros: VoluntarioFiltros = {};
  private readonly destroyRef = inject(DestroyRef);

  constructor(
    private voluntarioService: VoluntarioService,
    private departamentoService: DepartamentoService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private plantillaExcelService: PlantillaExcelService,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    this.departamentoService.getAll().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(data => {
      this.departamentos = data;
      this.columns = this.buildColumns();
    });
    this.loadVoluntarios();
  }

  private buildColumns(): ColumnDef[] {
    return [
      { key: 'id', header: this.translate.instant('Voluntarios.Columns.Id'), type: 'text', width: '60px' },
      {
        key: 'nombreCompleto', header: this.translate.instant('Voluntarios.Columns.Nombre'), type: 'text',
        filterType: 'text', sortable: true,
      },
      { key: 'dni', header: this.translate.instant('Voluntarios.Columns.Dni'), type: 'text', filterType: 'text' },
      { key: 'email', header: this.translate.instant('Voluntarios.Columns.Email'), type: 'text', filterType: 'text' },
      {
        key: 'departamentoNombre', header: this.translate.instant('Voluntarios.Columns.Departamento'), type: 'text',
        filterType: 'select',
        filterOptions: this.departamentos.map(d => d.nombre),
      },
      { key: 'congregacion', header: this.translate.instant('Voluntarios.Columns.Congregacion'), type: 'text', filterType: 'text' },
      { key: 'circuito', header: this.translate.instant('Voluntarios.Columns.Circuito'), type: 'text', filterType: 'text' },
      { key: 'correoJw', header: this.translate.instant('Voluntarios.Columns.CorreoJw'), type: 'text', hidden: true },
      {
        key: 'activoLabel', header: this.translate.instant('Voluntarios.Columns.Estado'), type: 'badge',
        filterType: 'select',
        filterOptions: [
          this.translate.instant('Voluntarios.Badges.Activo'),
          this.translate.instant('Voluntarios.Badges.Inactivo'),
        ],
        badgeMap: {
          [this.translate.instant('Voluntarios.Badges.Activo')]: 'dt-badge--success',
          [this.translate.instant('Voluntarios.Badges.Inactivo')]: 'dt-badge--danger',
        },
      },
      {
        key: 'formacionLabel', header: this.translate.instant('Voluntarios.Columns.Formacion'), type: 'badge',
        filterType: 'select',
        filterOptions: [
          this.translate.instant('Voluntarios.Badges.Completada'),
          this.translate.instant('Voluntarios.Badges.Pendiente'),
        ],
        badgeMap: {
          [this.translate.instant('Voluntarios.Badges.Completada')]: 'dt-badge--success',
          [this.translate.instant('Voluntarios.Badges.Pendiente')]: 'dt-badge--warn',
        },
      },
      {
        key: 'acciones', header: this.translate.instant('Voluntarios.Columns.Actions'), type: 'actions', sticky: 'end',
        actions: [
          { id: 'edit', icon: 'edit', label: this.translate.instant('Voluntarios.Actions.Edit'), color: 'primary' },
          {
            id: 'toggle',
            icon: 'person_off',
            iconFn: (row) => row.activo ? 'person_off' : 'person',
            label: this.translate.instant('Voluntarios.Actions.ToggleActive'),
            color: 'accent',
          },
          { id: 'delete', icon: 'delete', label: this.translate.instant('Voluntarios.Actions.Delete'), color: 'warn' },
        ],
      },
    ];
  }

  loadVoluntarios(page = this.currentPage): void {
    this.currentPage = page;
    this.loading = true;
    this.voluntarioService.getAllPaged(page, this.pageSize, this.currentFiltros).subscribe({
      next: (data) => {
        this.voluntarios = data.content.map(v => this.mapRow(v));
        this.totalElements = data.totalElements;
        this.loading = false;
      },
      error: () => { this.loading = false; this.showError(this.translate.instant('Voluntarios.Snack.LoadError')); },
    });
  }

  private mapRow(v: VoluntarioDTO) {
    return {
      ...v,
      nombreCompleto:    [v.nombre, v.apellido1, v.apellido2].filter(Boolean).join(' '),
      departamentoNombre: (v.departamentoNombres ?? []).join(' | '),
      activoLabel:       v.activo      ? this.translate.instant('Voluntarios.Badges.Activo')     : this.translate.instant('Voluntarios.Badges.Inactivo'),
      formacionLabel:    v.formacion   ? this.translate.instant('Voluntarios.Badges.Completada') : this.translate.instant('Voluntarios.Badges.Pendiente'),
    };
  }

  onFilterChange(filters: ActiveFilters): void {
    const nombre = (filters['nombreCompleto'] as string) || undefined;
    const dni    = (filters['dni']            as string) || undefined;
    const email  = (filters['email']          as string) || undefined;
    const deptoNombre      = filters['departamentoNombre'] as string | null;
    const activoLabel      = filters['activoLabel']        as string | null;
    const formacionLabel   = filters['formacionLabel']     as string | null;
    const congregacion     = (filters['congregacion']      as string) || undefined;
    const circuito         = (filters['circuito']          as string) || undefined;

    const activo     = this.translate.instant('Voluntarios.Badges.Activo');
    const inactivo   = this.translate.instant('Voluntarios.Badges.Inactivo');
    const completada = this.translate.instant('Voluntarios.Badges.Completada');
    const pendiente  = this.translate.instant('Voluntarios.Badges.Pendiente');
    const depto = deptoNombre ? this.departamentos.find(d => d.nombre === deptoNombre) : null;

    this.currentFiltros = {
      busqueda:       dni || nombre || undefined,
      email:          email,
      departamentoId: depto?.id ?? null,
      activo:         activoLabel === activo ? true : activoLabel === inactivo ? false : null,
      formacion:      formacionLabel === completada ? true : formacionLabel === pendiente ? false : null,
      congregacion,
      circuito,
    };
    this.loadVoluntarios(0);
  }

  onPageChange(event: PageEvent): void {
    this.pageSize = event.pageSize;
    this.loadVoluntarios(event.pageIndex);
  }

  onActionClick(event: TableActionEvent): void {
    const row = event.row as VoluntarioDTO;
    switch (event.action) {
      case 'edit':   this.openEditDialog(row);          break;
      case 'toggle': this.confirmToggleActivo(row);     break;
      case 'delete': this.confirmDelete(row);           break;
    }
  }

  openCreateDialog(): void {
    const ref = this.dialog.open(VoluntarioDialogComponent, {
      width: '600px', disableClose: true,
      data: { departamentos: this.departamentos } as VoluntarioDialogData,
    });
    ref.afterClosed().subscribe(dto => { if (dto) this.create(dto); });
  }

  openEditDialog(voluntario: VoluntarioDTO): void {
    const ref = this.dialog.open(VoluntarioDialogComponent, {
      width: '600px', disableClose: true,
      data: { voluntario, departamentos: this.departamentos } as VoluntarioDialogData,
    });
    ref.afterClosed().subscribe(dto => { if (dto) this.update(voluntario.id!, dto); });
  }

  confirmDelete(v: VoluntarioDTO): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '420px',
      data: {
        title: this.translate.instant('Voluntarios.ConfirmDelete.Title'),
        message: this.translate.instant('Voluntarios.ConfirmDelete.Message', { name: v.nombre + ' ' + v.apellido1 }),
        confirmText: this.translate.instant('Voluntarios.ConfirmDelete.Confirm'),
        confirmColor: 'warn',
        icon: 'delete',
      },
    });
    ref.afterClosed().subscribe((ok: boolean) => { if (ok) this.delete(v); });
  }

  confirmToggleActivo(v: VoluntarioDTO): void {
    const desactivando = v.activo;
    const name = v.nombre + ' ' + v.apellido1;
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '420px',
      data: {
        title: desactivando
          ? this.translate.instant('Voluntarios.ConfirmDeactivate.Title')
          : this.translate.instant('Voluntarios.ConfirmActivate.Title'),
        message: desactivando
          ? this.translate.instant('Voluntarios.ConfirmDeactivate.Message', { name })
          : this.translate.instant('Voluntarios.ConfirmActivate.Message', { name }),
        confirmText: desactivando
          ? this.translate.instant('Voluntarios.ConfirmDeactivate.Confirm')
          : this.translate.instant('Voluntarios.ConfirmActivate.Confirm'),
        confirmColor: desactivando ? 'warn' : 'primary',
        icon: desactivando ? 'person_off' : 'person',
      },
    });
    ref.afterClosed().subscribe((ok: boolean) => { if (ok) this.toggleActivo(v); });
  }

  create(dto: VoluntarioDTO): void {
    this.voluntarioService.create(dto).subscribe({
      next: () => { this.showSuccess(this.translate.instant('Voluntarios.Snack.Created')); this.loadVoluntarios(0); },
      error: (err) => this.showError(err?.error?.message || this.translate.instant('Voluntarios.Snack.CreateError')),
    });
  }

  update(id: number, dto: VoluntarioDTO): void {
    this.voluntarioService.update(id, dto).subscribe({
      next: () => { this.showSuccess(this.translate.instant('Voluntarios.Snack.Updated')); this.loadVoluntarios(); },
      error: (err) => this.showError(err?.error?.message || this.translate.instant('Voluntarios.Snack.UpdateError')),
    });
  }

  delete(v: VoluntarioDTO): void {
    this.voluntarioService.delete(v.id!).subscribe({
      next: () => { this.showSuccess(this.translate.instant('Voluntarios.Snack.Deleted')); this.loadVoluntarios(); },
      error: () => this.showError(this.translate.instant('Voluntarios.Snack.DeleteError')),
    });
  }

  toggleActivo(v: VoluntarioDTO): void {
    const accion = v.activo
      ? this.voluntarioService.desactivar(v.id!)
      : this.voluntarioService.activar(v.id!);
    accion.subscribe({
      next: () => { this.showSuccess(this.translate.instant('Voluntarios.Snack.StatusUpdated')); this.loadVoluntarios(); },
      error: () => this.showError(this.translate.instant('Voluntarios.Snack.StatusError')),
    });
  }

  abrirSelectorArchivo(): void {
    this.fileInput.nativeElement.value = '';
    this.fileInput.nativeElement.click();
  }

  exportarExcel(): void {
    this.exportandoExcel = true;
    this.voluntarioService.getAllPaged(0, 5000, this.currentFiltros).subscribe({
      next: (data) => {
        const voluntarios = data.content.map(v => v as VoluntarioDTO);
        this.plantillaExcelService.exportarVoluntarios(voluntarios).finally(() => {
          this.exportandoExcel = false;
        });
      },
      error: () => {
        this.exportandoExcel = false;
        this.showError(this.translate.instant('Voluntarios.Snack.LoadError'));
      },
    });
  }

  descargarPlantillaMaestra(): void {
    this.plantillaExcelService.descargarPlantillaMaestra();
  }

  descargarPlantillaCsv(): void {
    const cabecera = 'apellido1,apellido2,nombre,dni,congregacion,circuito,departamento,correo_jw,email';
    const blob = new Blob([`${cabecera}\n`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'plantilla_voluntarios.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  onArchivoSeleccionado(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    const archivo = input.files[0];

    const ext = archivo.name.toLowerCase();
    const allowed = ext.endsWith('.csv') || ext.endsWith('.xlsx') || ext.endsWith('.xls');
    if (!allowed) {
      this.showError(this.translate.instant('Voluntarios.Snack.InvalidFile'));
      return;
    }

    this.subiendoArchivo = true;
    this.voluntarioService.uploadMasivo(archivo).subscribe({
      next: (resultado) => {
        this.subiendoArchivo = false;
        this.loadVoluntarios(0);
        this.dialog.open(CargaMasivaResultadoDialogComponent, { width: '750px', data: resultado });
      },
      error: (err) => {
        this.subiendoArchivo = false;
        this.showError(err?.error?.message || this.translate.instant('Voluntarios.Snack.FileError'));
      },
    });
  }

  private showSuccess(msg: string): void {
    this.snackBar.open(msg, this.translate.instant('Common.Close'), { duration: 3000, panelClass: ['success-snackbar'] });
  }

  private showError(msg: string): void {
    this.snackBar.open(msg, this.translate.instant('Common.Close'), { duration: 4000, panelClass: ['error-snackbar'] });
  }
}
