import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { EventoDTO } from '../../../models/evento.model';

export interface EventoDialogData {
  evento?: EventoDTO;
}

@Component({
  selector: 'app-evento-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule
  ],
  templateUrl: './evento-dialog.component.html',
  styleUrls: ['./evento-dialog.component.scss']
})
export class EventoDialogComponent implements OnInit {
  form!: FormGroup;
  isEdit: boolean = false;

  tiposEvento = ['Asamblea', 'Formación', 'Servicio', 'Reunión', 'Otro'];
  sesiones = ['Mañana', 'Tarde', 'Noche', 'Todo el día'];

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<EventoDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: EventoDialogData
  ) {}

  ngOnInit(): void {
    this.isEdit = !!this.data.evento?.id;
    const e = this.data.evento;

    this.form = this.fb.group({
      nombre: [e?.nombre || '', [Validators.required, Validators.minLength(3), Validators.maxLength(150)]],
      tipoEvento: [e?.tipoEvento || ''],
      direccion: [e?.direccion || ''],
      sesion: [e?.sesion || ''],
      fechaInicioEvento: [this.toDatetimeLocal(e?.fechaInicioEvento), Validators.required],
      fechaFinEvento: [this.toDatetimeLocal(e?.fechaFinEvento), Validators.required],
      fechaInicioConvocatoria: [this.toDatetimeLocal(e?.fechaInicioConvocatoria)],
      fechaFinConvocatoria: [this.toDatetimeLocal(e?.fechaFinConvocatoria)]
    });
  }

  onSave(): void {
    if (this.form.invalid) return;
    const v = this.form.value;
    const result: EventoDTO = {
      ...(this.isEdit ? { id: this.data.evento!.id } : {}),
      nombre: v.nombre,
      tipoEvento: v.tipoEvento || undefined,
      direccion: v.direccion || undefined,
      sesion: v.sesion || undefined,
      fechaInicioEvento: this.toIso(v.fechaInicioEvento),
      fechaFinEvento: this.toIso(v.fechaFinEvento),
      fechaInicioConvocatoria: this.toIso(v.fechaInicioConvocatoria),
      fechaFinConvocatoria: this.toIso(v.fechaFinConvocatoria)
    };
    this.dialogRef.close(result);
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  private toDatetimeLocal(iso?: string): string {
    if (!iso) return '';
    // Convert ISO 8601 to datetime-local format (YYYY-MM-DDTHH:mm)
    return iso.substring(0, 16);
  }

  private toIso(datetimeLocal?: string): string | undefined {
    if (!datetimeLocal) return undefined;
    return new Date(datetimeLocal).toISOString();
  }
}

