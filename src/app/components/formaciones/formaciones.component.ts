import { Component, Inject, OnInit } from '@angular/core';
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
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { FormacionService } from '../../services/formacion.service';
import { FormacionDTO } from '../../models/formacion.model';
import { EventoService } from '../../services/evento.service';
import { EventoDTO } from '../../models/evento.model';
import { VoluntarioService } from '../../services/voluntario.service';
import { VoluntarioDTO } from '../../models/voluntario.model';

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
    CommonModule,
    MatTableModule, MatButtonModule, MatIconModule, MatCardModule,
    MatProgressSpinnerModule, MatSnackBarModule, MatDialogModule,
    MatTooltipModule, MatFormFieldModule, MatSelectModule, MatSlideToggleModule,
    ReactiveFormsModule
  ],
  templateUrl: './formaciones.component.html',
  styleUrls: ['./formaciones.component.scss']
})
export class FormacionesComponent implements OnInit {
  eventosFormacion: EventoDTO[] = [];
  eventoSeleccionado: EventoDTO | null = null;
  registros: FormacionDTO[] = [];
  voluntarios: VoluntarioDTO[] = [];

  displayedColumns = ['voluntarioNombre', 'voluntarioDni', 'asistio', 'aprobada', 'acciones'];
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
      error: () => { this.loading = false; this.showError('Error al cargar eventos de formación'); }
    });
    this.voluntarioService.getAll().subscribe({
      next: (data) => this.voluntarios = data
    });
  }

  onEventoChange(evento: EventoDTO): void {
    this.eventoSeleccionado = evento;
    this.cargarRegistros();
  }

  cargarRegistros(): void {
    if (!this.eventoSeleccionado?.id) return;
    this.loadingRegistros = true;
    this.formacionService.getByEvento(this.eventoSeleccionado.id).subscribe({
      next: (data) => { this.registros = data; this.loadingRegistros = false; },
      error: () => { this.loadingRegistros = false; this.showError('Error al cargar registros'); }
    });
  }

  abrirDialogoRegistrar(): void {
    if (!this.eventoSeleccionado?.id) return;
    const ref = this.dialog.open(RegistrarFormacionDialogComponent, {
      width: '440px',
      disableClose: true,
      data: { eventoId: this.eventoSeleccionado.id, voluntarios: this.voluntarios } as RegistrarFormacionData
    });
    ref.afterClosed().subscribe(voluntarioId => {
      if (voluntarioId) {
        this.formacionService.registrar(this.eventoSeleccionado!.id!, voluntarioId).subscribe({
          next: () => { this.showSuccess('Voluntario registrado'); this.cargarRegistros(); },
          error: () => this.showError('Error al registrar voluntario')
        });
      }
    });
  }

  toggleAprobada(registro: FormacionDTO): void {
    const nuevoValor = !registro.aprobada;
    this.formacionService.actualizarAprobada(registro.id!, nuevoValor).subscribe({
      next: () => {
        registro.aprobada = nuevoValor;
        this.showSuccess(nuevoValor ? 'Marcado como aprobado' : 'Desmarcado como aprobado');
      },
      error: () => this.showError('Error al actualizar aprobada')
    });
  }

  eliminar(registro: FormacionDTO): void {
    if (!confirm(`¿Eliminar el registro de ${registro.voluntarioNombre}?`)) return;
    this.formacionService.delete(registro.id!).subscribe({
      next: () => { this.showSuccess('Registro eliminado'); this.cargarRegistros(); },
      error: () => this.showError('Error al eliminar registro')
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
