import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { TranslateModule } from '@ngx-translate/core';
import { VoluntarioDTO } from '@app/models/voluntario.model';

export interface DepartamentoDialogData {
  id?: number;
  nombre?: string;
  responsable?: string;
  auxiliares?: string;
  voluntarios?: VoluntarioDTO[];
}

@Component({
  selector: 'app-departamento-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    TranslateModule,
  ],
  templateUrl: './departamento-dialog.component.html',
  styleUrls: ['./departamento-dialog.component.scss']
})
export class DepartamentoDialogComponent implements OnInit {
  form!: FormGroup;
  voluntarios: VoluntarioDTO[] = [];
  auxiliaresDisponibles: VoluntarioDTO[] = [];

  responsableFilter = '';
  auxiliaresFilter  = '';

  get voluntariosFiltradosParaResponsable(): VoluntarioDTO[] {
    if (!this.responsableFilter.trim()) return this.voluntarios;
    const q = this.responsableFilter.toLowerCase();
    return this.voluntarios.filter(v =>
      this.getVoluntarioNombre(v).toLowerCase().includes(q) || v.dni.toLowerCase().includes(q)
    );
  }

  get voluntariosFiltradosParaAuxiliares(): VoluntarioDTO[] {
    if (!this.auxiliaresFilter.trim()) return this.auxiliaresDisponibles;
    const q = this.auxiliaresFilter.toLowerCase();
    return this.auxiliaresDisponibles.filter(v =>
      this.getVoluntarioNombre(v).toLowerCase().includes(q) || v.dni.toLowerCase().includes(q)
    );
  }

  onResponsablePanelOpen(): void  { this.responsableFilter = ''; }
  onAuxiliaresPanelOpen(): void   { this.auxiliaresFilter  = ''; }

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<DepartamentoDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DepartamentoDialogData
  ) {}

  ngOnInit(): void {
    this.voluntarios = this.data.voluntarios || [];
    this.auxiliaresDisponibles = [...this.voluntarios];

    this.form = this.fb.group({
      nombre: [
        this.data.nombre || '',
        [
          Validators.required,
          Validators.minLength(3),
          Validators.maxLength(100)
        ]
      ],
      responsable: [this.resolveVoluntarioValue(this.data.responsable)],
      auxiliares: [this.resolveVoluntarioValues(this.data.auxiliares)]
    });

    this.syncAuxiliaresWithResponsable(this.form.get('responsable')?.value || '');
    this.form.get('responsable')?.valueChanges.subscribe((responsable: string) => {
      this.syncAuxiliaresWithResponsable(responsable || '');
    });
  }

  onSave(): void {
    if (this.form.valid) {
      const formValue = this.form.value;
      const responsable = formValue.responsable || '';
      const auxiliares = Array.isArray(formValue.auxiliares)
        ? formValue.auxiliares.join(', ')
        : '';

      this.dialogRef.close({
        id: this.data.id,
        nombre: formValue.nombre,
        responsable,
        auxiliares
      });
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  getVoluntarioNombre(voluntario: VoluntarioDTO): string {
    return [voluntario.nombre, voluntario.apellido1, voluntario.apellido2]
      .filter(Boolean)
      .join(' ');
  }

  private syncAuxiliaresWithResponsable(responsableDni: string): void {
    this.auxiliaresDisponibles = this.voluntarios.filter(
      voluntario => voluntario.dni !== responsableDni
    );

    const auxiliaresControl = this.form.get('auxiliares');
    const auxiliaresActuales = Array.isArray(auxiliaresControl?.value)
      ? auxiliaresControl?.value
      : [];
    const auxiliaresFiltrados = auxiliaresActuales.filter((dni: string) => dni !== responsableDni);

    if (auxiliaresFiltrados.length !== auxiliaresActuales.length) {
      auxiliaresControl?.setValue(auxiliaresFiltrados, { emitEvent: false });
    }
  }

  private resolveVoluntarioValue(value?: string): string {
    const normalizedValue = value?.trim();
    if (!normalizedValue) return '';

    const voluntario = this.voluntarios.find(item => {
      const nombreCompleto = this.getVoluntarioNombre(item);
      return item.dni === normalizedValue || nombreCompleto === normalizedValue;
    });

    // Si no se encuentra en la lista, preserva el valor original (no lo borra)
    return voluntario?.dni ?? normalizedValue;
  }

  private resolveVoluntarioValues(value?: string): string[] {
    if (!value) return [];

    return value
      .split(',')
      .map(item => this.resolveVoluntarioValue(item))
      .filter(Boolean);
  }
}

