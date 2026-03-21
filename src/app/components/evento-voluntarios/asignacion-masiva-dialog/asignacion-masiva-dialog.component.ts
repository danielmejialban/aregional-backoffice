import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { EventoDTO } from '../../../models/evento.model';
import { DepartamentoDTO } from '../../../models/departamento.model';
import { AsignacionMasivaResultadoDTO, AsignacionMasivaDetalleDTO } from '../../../models/evento-voluntario.model';
import { EventoVoluntarioService } from '../../../services/evento-voluntario.service';

export interface AsignacionMasivaDialogData {
  eventos: EventoDTO[];
  departamentos: DepartamentoDTO[];
}

@Component({
  selector: 'app-asignacion-masiva-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatCheckboxModule,
    MatProgressSpinnerModule,
    MatTableModule,
    MatChipsModule,
    MatTooltipModule
  ],
  templateUrl: './asignacion-masiva-dialog.component.html',
  styleUrls: ['./asignacion-masiva-dialog.component.scss']
})
export class AsignacionMasivaDialogComponent implements OnInit {
  form!: FormGroup;
  loading = false;
  resultado: AsignacionMasivaResultadoDTO | null = null;
  detalleColumns = ['nombre', 'dni', 'estado', 'mensaje'];

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<AsignacionMasivaDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: AsignacionMasivaDialogData,
    private eventoVoluntarioService: EventoVoluntarioService
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      eventoId: [null, Validators.required],
      departamentoId: [null, Validators.required],
      generarQr: [true]
    });
  }

  get canSubmit(): boolean {
    return this.form.valid && !this.loading;
  }

  onAsignar(): void {
    if (!this.canSubmit) return;

    const eventoNombre = this.data.eventos.find(e => e.id === this.form.value.eventoId)?.nombre ?? '';
    const deptNombre = this.data.departamentos.find(d => d.id === this.form.value.departamentoId)?.nombre ?? '';

    if (!confirm(`¿Asignar todos los voluntarios activos de "${deptNombre}" al evento "${eventoNombre}"?`)) return;

    this.loading = true;
    this.resultado = null;

    this.eventoVoluntarioService.asignacionMasiva(this.form.value).subscribe({
      next: (res) => {
        this.loading = false;
        this.resultado = res;
      },
      error: (err) => {
        this.loading = false;
        alert('Error al ejecutar la asignación masiva: ' + (err?.error?.message ?? err.message));
      }
    });
  }

  getEstadoColor(estado: string): string {
    switch (estado) {
      case 'CREADO': return 'primary';
      case 'OMITIDO': return 'accent';
      case 'ERROR': return 'warn';
      default: return '';
    }
  }

  onCerrar(recargar: boolean): void {
    this.dialogRef.close(recargar);
  }
}

