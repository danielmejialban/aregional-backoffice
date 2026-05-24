import { Component, ElementRef, Inject, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTabsModule } from '@angular/material/tabs';
import { VoluntarioService } from '../../services/voluntario.service';
import { VoluntarioDTO } from '../../models/voluntario.model';
import { DepartamentoService } from '../../services/departamento.service';
import { DepartamentoDTO } from '../../models/departamento.model';
import { CargaMasivaResultadoDTO, FilaResultadoDTO } from '../../models/carga-masiva-resultado.model';
import { PlantillaExcelService } from '../../services/plantilla-excel.service';

export interface VoluntarioDialogData {
  voluntario?: VoluntarioDTO;
  departamentos: DepartamentoDTO[];
}

// ── Diálogo create/edit voluntario ─────────────────────────────────────────
@Component({
  selector: 'app-voluntario-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatSlideToggleModule
  ],
  template: `
    <h2 mat-dialog-title>{{ data.voluntario?.id ? 'Editar Voluntario' : 'Nuevo Voluntario' }}</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="form-grid">
        <div class="row-2">
          <mat-form-field appearance="outline">
            <mat-label>Nombre</mat-label>
            <input matInput formControlName="nombre" required>
            <mat-error *ngIf="form.get('nombre')?.hasError('required')">Obligatorio</mat-error>
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Primer apellido</mat-label>
            <input matInput formControlName="apellido1" required>
            <mat-error *ngIf="form.get('apellido1')?.hasError('required')">Obligatorio</mat-error>
          </mat-form-field>
        </div>
        <div class="row-2">
          <mat-form-field appearance="outline">
            <mat-label>Segundo apellido</mat-label>
            <input matInput formControlName="apellido2">
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>DNI / NIE</mat-label>
            <input matInput formControlName="dni" required placeholder="12345678A">
            <mat-error *ngIf="form.get('dni')?.hasError('required')">Obligatorio</mat-error>
            <mat-error *ngIf="form.get('dni')?.hasError('pattern')">Formato inválido (DNI: 8 dígitos + letra, NIE: X/Y/Z + 7 dígitos + letra)</mat-error>
          </mat-form-field>
        </div>
        <div class="row-2">
          <mat-form-field appearance="outline">
            <mat-label>Teléfono</mat-label>
            <input matInput formControlName="telefono">
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Email</mat-label>
            <input matInput formControlName="email" type="email">
            <mat-error *ngIf="form.get('email')?.hasError('email')">Email inválido</mat-error>
          </mat-form-field>
        </div>
        <div class="row-2">
          <mat-form-field appearance="outline">
            <mat-label>Congregación</mat-label>
            <input matInput formControlName="congregacion">
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Circuito</mat-label>
            <input matInput formControlName="circuito">
          </mat-form-field>
        </div>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Correo JW</mat-label>
          <input matInput formControlName="correoJw">
        </mat-form-field>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Departamento</mat-label>
          <mat-select formControlName="departamentoId" required>
            <mat-option *ngFor="let d of data.departamentos" [value]="d.id">{{ d.nombre }}</mat-option>
          </mat-select>
          <mat-error *ngIf="form.get('departamentoId')?.hasError('required')">Obligatorio</mat-error>
        </mat-form-field>
        <div class="toggles-row">
          <mat-slide-toggle formControlName="activo" color="primary">Activo</mat-slide-toggle>
          <mat-slide-toggle formControlName="preAsamblea" color="accent">Pre-asamblea</mat-slide-toggle>
        </div>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="dialogRef.close()">Cancelar</button>
      <button mat-raised-button color="primary" (click)="onSave()" [disabled]="!form.valid">
        <mat-icon>save</mat-icon> {{ data.voluntario?.id ? 'Guardar' : 'Crear' }}
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
    this.form = this.fb.group({
      nombre:        [v?.nombre    || '', Validators.required],
      apellido1:     [v?.apellido1 || '', Validators.required],
      apellido2:     [v?.apellido2 || ''],
      dni:           [v?.dni       || '', [Validators.required, Validators.pattern(/^[0-9]{8}[A-Z]$|^[XYZ][0-9]{7}[A-Z]$/)]],
      telefono:      [v?.telefono  || ''],
      email:         [v?.email     || '', Validators.email],
      congregacion:  [v?.congregacion || ''],
      circuito:      [v?.circuito     || ''],
      correoJw:      [v?.correoJw     || ''],
      departamentoId:[v?.departamentoId ?? null, Validators.required],
      activo:        [v?.activo        ?? true],
      preAsamblea:   [v?.preAsamblea   ?? false]
    });
  }

  onSave(): void {
    if (!this.form.valid) return;
    const val = this.form.value;
    const dto: VoluntarioDTO = {
      id:            this.data.voluntario?.id,
      nombre:        val.nombre.trim(),
      apellido1:     val.apellido1.trim(),
      apellido2:     val.apellido2?.trim() || undefined,
      dni:           val.dni.toUpperCase().trim(),
      telefono:      val.telefono?.trim()     || undefined,
      email:         val.email?.trim()        || undefined,
      congregacion:  val.congregacion?.trim() || undefined,
      circuito:      val.circuito?.trim()     || undefined,
      correoJw:      val.correoJw?.trim()     || undefined,
      departamentoId: val.departamentoId,
      activo:        val.activo,
      preAsamblea:   val.preAsamblea
    };
    this.dialogRef.close(dto);
  }
}

// ── Diálogo de resultado CSV ───────────────────────────────────────────────
@Component({
  selector: 'app-carga-masiva-resultado-dialog',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatTableModule, MatChipsModule, MatDialogModule, MatTabsModule, MatIconModule],
  template: `
    <h2 mat-dialog-title>Resultado de la carga masiva</h2>
    <mat-dialog-content>
      <div class="resumen">
        <span class="chip total">📋 Total: {{ data.totalFilas }}</span>
        <span class="chip creado">✔ Creados: {{ data.creados }}</span>
        <span class="chip omitido">⚠ Omitidos: {{ data.omitidos }}</span>
        <span class="chip error">✖ Errores: {{ data.errores }}</span>
      </div>
      <mat-tab-group>
        <mat-tab [label]="'Errores (' + errores.length + ')'">
          <ng-container *ngTemplateOutlet="tablaDetalle; context: { $implicit: errores }"></ng-container>
        </mat-tab>
        <mat-tab [label]="'Omitidos (' + omitidos.length + ')'">
          <ng-container *ngTemplateOutlet="tablaDetalle; context: { $implicit: omitidos }"></ng-container>
        </mat-tab>
        <mat-tab [label]="'Creados (' + creados.length + ')'">
          <ng-container *ngTemplateOutlet="tablaDetalle; context: { $implicit: creados }"></ng-container>
        </mat-tab>
      </mat-tab-group>
      <ng-template #tablaDetalle let-filas>
        <p *ngIf="filas.length === 0" class="empty-tab">Sin registros en esta categoría.</p>
        <table mat-table [dataSource]="filas" class="detalle-table" *ngIf="filas.length > 0">
          <ng-container matColumnDef="fila">
            <th mat-header-cell *matHeaderCellDef>Fila</th>
            <td mat-cell *matCellDef="let r">{{ r.fila }}</td>
          </ng-container>
          <ng-container matColumnDef="estado">
            <th mat-header-cell *matHeaderCellDef>Estado</th>
            <td mat-cell *matCellDef="let r">
              <span [class]="'chip ' + r.estado.toLowerCase()">{{ r.estado }}</span>
            </td>
          </ng-container>
          <ng-container matColumnDef="dni">
            <th mat-header-cell *matHeaderCellDef>DNI / NIE</th>
            <td mat-cell *matCellDef="let r">{{ r.dni || '-' }}</td>
          </ng-container>
          <ng-container matColumnDef="mensaje">
            <th mat-header-cell *matHeaderCellDef>Mensaje</th>
            <td mat-cell *matCellDef="let r">{{ r.mensaje }}</td>
          </ng-container>
          <tr mat-header-row *matHeaderRowDef="cols"></tr>
          <tr mat-row *matRowDef="let row; columns: cols;"></tr>
        </table>
      </ng-template>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-raised-button color="primary" (click)="dialogRef.close()">Cerrar</button>
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
    CommonModule,
    MatTableModule, MatButtonModule, MatIconModule,
    MatCardModule, MatProgressSpinnerModule, MatSnackBarModule,
    MatDialogModule, MatTooltipModule, MatChipsModule
  ],
  templateUrl: './voluntarios.component.html',
  styleUrls: ['./voluntarios.component.scss']
})
export class VoluntariosComponent implements OnInit {
  @ViewChild('csvInput') csvInput!: ElementRef<HTMLInputElement>;

  voluntarios: VoluntarioDTO[]  = [];
  departamentos: DepartamentoDTO[] = [];
  displayedColumns = ['id', 'nombre', 'dni', 'departamento', 'congregacion', 'circuito', 'correoJw', 'preAsamblea', 'activo', 'formacion', 'acciones'];
  loading = false;
  subiendoCsv = false;

  constructor(
    private voluntarioService: VoluntarioService,
    private departamentoService: DepartamentoService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private plantillaExcelService: PlantillaExcelService
  ) {}

  ngOnInit(): void {
    this.loadVoluntarios();
    this.departamentoService.getAll().subscribe(data => this.departamentos = data);
  }

  loadVoluntarios(): void {
    this.loading = true;
    this.voluntarioService.getAll().subscribe({
      next: (data) => { this.voluntarios = data; this.loading = false; },
      error: () => { this.loading = false; this.showError('Error al cargar voluntarios'); }
    });
  }

  openCreateDialog(): void {
    const ref = this.dialog.open(VoluntarioDialogComponent, {
      width: '600px',
      disableClose: true,
      data: { departamentos: this.departamentos } as VoluntarioDialogData
    });
    ref.afterClosed().subscribe(dto => {
      if (dto) this.create(dto);
    });
  }

  openEditDialog(voluntario: VoluntarioDTO): void {
    const ref = this.dialog.open(VoluntarioDialogComponent, {
      width: '600px',
      disableClose: true,
      data: { voluntario, departamentos: this.departamentos } as VoluntarioDialogData
    });
    ref.afterClosed().subscribe(dto => {
      if (dto) this.update(voluntario.id!, dto);
    });
  }

  create(dto: VoluntarioDTO): void {
    this.voluntarioService.create(dto).subscribe({
      next: () => { this.showSuccess('Voluntario creado'); this.loadVoluntarios(); },
      error: (err) => this.showError(err?.error?.message || 'Error al crear voluntario')
    });
  }

  update(id: number, dto: VoluntarioDTO): void {
    this.voluntarioService.update(id, dto).subscribe({
      next: () => { this.showSuccess('Voluntario actualizado'); this.loadVoluntarios(); },
      error: (err) => this.showError(err?.error?.message || 'Error al actualizar voluntario')
    });
  }

  delete(voluntario: VoluntarioDTO): void {
    if (!confirm(`¿Eliminar a ${voluntario.nombre} ${voluntario.apellido1}?`)) return;
    this.voluntarioService.delete(voluntario.id!).subscribe({
      next: () => { this.showSuccess('Voluntario eliminado'); this.loadVoluntarios(); },
      error: () => this.showError('Error al eliminar voluntario')
    });
  }

  toggleActivo(voluntario: VoluntarioDTO): void {
    const accion = voluntario.activo
      ? this.voluntarioService.desactivar(voluntario.id!)
      : this.voluntarioService.activar(voluntario.id!);
    accion.subscribe({
      next: () => { this.showSuccess('Estado actualizado'); this.loadVoluntarios(); },
      error: () => this.showError('Error al cambiar estado')
    });
  }

  abrirSelectorCsv(): void {
    this.csvInput.nativeElement.value = '';
    this.csvInput.nativeElement.click();
  }

  descargarPlantillaMaestra(): void {
    this.plantillaExcelService.descargarPlantillaMaestra();
  }

  descargarPlantillaCsv(): void {
    const cabecera = 'apellido1,apellido2,nombre,dni,congregacion,circuito,departamento,correo_jw,pre_asamblea';
    const ejemplo  = 'García,López,Juan,12345678A,Madrid Norte,Circuito 5,Acomodación,juan@jw.org,false';
    const blob = new Blob([`${cabecera}\n${ejemplo}\n`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'plantilla_voluntarios.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  onCsvSeleccionado(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    const archivo = input.files[0];
    if (!archivo.name.endsWith('.csv')) {
      this.showError('El archivo debe ser un CSV (.csv)');
      return;
    }
    this.subiendoCsv = true;
    this.voluntarioService.uploadCsv(archivo).subscribe({
      next: (resultado) => {
        this.subiendoCsv = false;
        this.loadVoluntarios();
        this.dialog.open(CargaMasivaResultadoDialogComponent, { width: '750px', data: resultado });
      },
      error: (err) => {
        this.subiendoCsv = false;
        this.showError(err?.error?.message || 'Error al procesar el CSV');
      }
    });
  }

  private showSuccess(msg: string): void {
    this.snackBar.open(msg, 'Cerrar', { duration: 3000, panelClass: ['success-snackbar'] });
  }

  private showError(msg: string): void {
    this.snackBar.open(msg, 'Cerrar', { duration: 4000, panelClass: ['error-snackbar'] });
  }
}
