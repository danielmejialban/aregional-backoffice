import { Component, Inject, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { FormacionService } from '../../services/formacion.service';
import { FormacionDTO } from '../../models/formacion.model';
import { EventoService } from '../../services/evento.service';
import { EventoDTO } from '../../models/evento.model';
import { VoluntarioService } from '../../services/voluntario.service';
import { VoluntarioDTO } from '../../models/voluntario.model';
import { DataTableComponent } from '../data-table/data-table/data-table.component';
import { ColumnDef, TableActionEvent } from '@app/@core';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';

export interface RegistrarFormacionData {
  eventoId: number;
  voluntarios: VoluntarioDTO[];
}

// ── Diálogo para registrar un voluntario en la formación ──────────────────
@Component({
  selector: 'app-registrar-formacion-dialog',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatDialogModule, MatFormFieldModule, MatSelectModule, MatButtonModule, MatIconModule
  ],
  template: `
    <h2 mat-dialog-title>Registrar voluntario en formación</h2>
    <mat-dialog-content>
      <form [formGroup]="form" style="min-width:340px; padding-top:8px">
        <mat-form-field appearance="outline" style="width:100%">
          <mat-label>Voluntario</mat-label>
          <mat-select formControlName="voluntarioId" required>
            <mat-option *ngFor="let v of data.voluntarios" [value]="v.id">
              {{ v.apellido1 }} {{ v.apellido2 }} {{ v.nombre }} — {{ v.dni }}
            </mat-option>
          </mat-select>
          <mat-error>Selecciona un voluntario</mat-error>
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="dialogRef.close()">Cancelar</button>
      <button mat-raised-button color="primary" (click)="onSave()" [disabled]="!form.valid">
        <mat-icon>add</mat-icon> Registrar
      </button>
    </mat-dialog-actions>
  `
})
export class RegistrarFormacionDialogComponent implements OnInit {
  form!: FormGroup;

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<RegistrarFormacionDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: RegistrarFormacionData
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({ voluntarioId: [null, Validators.required] });
  }

  onSave(): void {
    if (this.form.valid) this.dialogRef.close(this.form.value.voluntarioId as number);
  }
}

// ── Componente principal ───────────────────────────────────────────────────
@Component({
  selector: 'app-formaciones',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatButtonModule, MatIconModule, MatCardModule,
    MatProgressSpinnerModule, MatSnackBarModule, MatDialogModule,
    MatTooltipModule, MatFormFieldModule, MatSelectModule, MatSlideToggleModule,
    DataTableComponent,
  ],
  templateUrl: './formaciones.component.html',
  styleUrls: ['./formaciones.component.scss']
})
export class FormacionesComponent implements OnInit {
  @ViewChild('aprobadaTpl', { static: false }) aprobadaTpl!: TemplateRef<{ $implicit: any }>;

  eventosFormacion: EventoDTO[] = [];
  eventoSeleccionado: EventoDTO | null = null;
  registros: any[] = [];
  voluntarios: VoluntarioDTO[] = [];
  columns: ColumnDef[] = [];

  loading = false;
  loadingRegistros = false;

  constructor(
    private formacionService: FormacionService,
    private eventoService: EventoService,
    private voluntarioService: VoluntarioService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loading = true;
    this.eventoService.getByTipo('FORMACION').subscribe({
      next: (data) => { this.eventosFormacion = data; this.loading = false; },
      error: () => { this.loading = false; this.showError('Error al cargar eventos de formación'); },
    });
    this.voluntarioService.getAll().subscribe({
      next: (data) => this.voluntarios = data,
    });
  }

  ngAfterViewInit(): void {
    this.columns = this.buildColumns();
  }

  private buildColumns(): ColumnDef[] {
    return [
      { key: 'voluntarioNombre', header: 'Voluntario', type: 'text', filterType: 'text', sortable: true },
      { key: 'voluntarioDni', header: 'DNI/NIE', type: 'text', filterType: 'text' },
      {
        key: 'asistioLabel', header: 'Asistió', type: 'badge',
        badgeMap: { 'Sí': 'dt-badge--success', 'No': 'dt-badge--neutral' },
      },
      { key: 'aprobada', header: 'Aprobada', type: 'custom', cellTemplate: this.aprobadaTpl },
      {
        key: 'acciones', header: 'Acciones', type: 'actions', sticky: 'end',
        actions: [
          { id: 'delete', icon: 'delete', label: 'Eliminar registro', color: 'warn' },
        ],
      },
    ];
  }

  onEventoChange(evento: EventoDTO): void {
    this.eventoSeleccionado = evento;
    this.cargarRegistros();
  }

  cargarRegistros(): void {
    if (!this.eventoSeleccionado?.id) return;
    this.loadingRegistros = true;
    this.formacionService.getByEvento(this.eventoSeleccionado.id).subscribe({
      next: (data) => {
        this.registros = data.map(r => ({
          ...r,
          asistioLabel: r.asistio ? 'Sí' : 'No',
        }));
        this.loadingRegistros = false;
      },
      error: () => { this.loadingRegistros = false; this.showError('Error al cargar registros'); },
    });
  }

  onActionClick(event: TableActionEvent): void {
    if (event.action === 'delete') {
      this.confirmEliminar(event.row as FormacionDTO);
    }
  }

  toggleAprobada(registro: FormacionDTO): void {
    const nuevoValor = !registro.aprobada;
    this.formacionService.actualizarAprobada(registro.id!, nuevoValor).subscribe({
      next: () => {
        registro.aprobada = nuevoValor;
        this.registros = this.registros.map(r => r.id === registro.id ? { ...r, aprobada: nuevoValor } : r);
        this.showSuccess(nuevoValor ? 'Marcado como aprobado' : 'Desmarcado como aprobado');
      },
      error: () => this.showError('Error al actualizar aprobada'),
    });
  }

  confirmEliminar(registro: FormacionDTO): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '420px',
      data: {
        title: 'Eliminar registro',
        message: `¿Estás seguro de que quieres eliminar el registro de ${registro.voluntarioNombre}?`,
        confirmText: 'Eliminar',
        confirmColor: 'warn',
        icon: 'delete',
      },
    });
    ref.afterClosed().subscribe((ok: boolean) => { if (ok) this.eliminar(registro); });
  }

  eliminar(registro: FormacionDTO): void {
    this.formacionService.delete(registro.id!).subscribe({
      next: () => { this.showSuccess('Registro eliminado'); this.cargarRegistros(); },
      error: () => this.showError('Error al eliminar registro'),
    });
  }

  countAsistio(): number   { return this.registros.filter(r => r.asistio).length; }
  countAprobados(): number { return this.registros.filter(r => r.aprobada).length; }

  private showSuccess(msg: string): void {
    this.snackBar.open(msg, 'Cerrar', { duration: 3000, panelClass: ['success-snackbar'] });
  }

  private showError(msg: string): void {
    this.snackBar.open(msg, 'Cerrar', { duration: 4000, panelClass: ['error-snackbar'] });
  }
}
