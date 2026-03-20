import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { VoluntarioDTO } from '../../../models/voluntario.model';
import { EventoDTO } from '../../../models/evento.model';

export interface AsignacionDialogData {
  voluntarios: VoluntarioDTO[];
  eventos: EventoDTO[];
}

@Component({
  selector: 'app-asignacion-dialog',
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
    MatProgressSpinnerModule
  ],
  templateUrl: './asignacion-dialog.component.html',
  styleUrls: ['./asignacion-dialog.component.scss']
})
export class AsignacionDialogComponent implements OnInit {
  form!: FormGroup;
  voluntarios: VoluntarioDTO[] = [];
  eventos: EventoDTO[] = [];

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<AsignacionDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: AsignacionDialogData
  ) {}

  ngOnInit(): void {
    this.voluntarios = this.data.voluntarios;
    this.eventos = this.data.eventos;

    this.form = this.fb.group({
      voluntarioId: [null, Validators.required],
      eventoId: [null, Validators.required]
    });
  }

  getVoluntarioNombre(v: VoluntarioDTO): string {
    return [v.nombre, v.apellido1, v.apellido2].filter(Boolean).join(' ');
  }

  onSave(): void {
    if (this.form.invalid) return;
    this.dialogRef.close(this.form.value);
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}

