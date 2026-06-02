import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { provideNativeDateAdapter } from '@angular/material/core';
import { EventoDTO } from '../../../models/evento.model';

export interface EventoDialogData {
  evento?: EventoDTO;
}

@Component({
  selector: 'app-evento-dialog',
  standalone: true,
  providers: [provideNativeDateAdapter()],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatDatepickerModule,
  ],
  templateUrl: './evento-dialog.component.html',
  styleUrls: ['./evento-dialog.component.scss']
})
export class EventoDialogComponent implements OnInit {
  form!: FormGroup;
  isEdit: boolean = false;

  tiposEvento = [
    { value: 'Asamblea',  label: 'Asamblea' },
    { value: 'FORMACION', label: 'Formación' },
    { value: 'Servicio',  label: 'Servicio' },
    { value: 'Reunión',   label: 'Reunión' },
    { value: 'Otro',      label: 'Otro' },
  ];
  sesiones = ['Mañana', 'Tarde', 'Todo el día'];

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
      fechaInicioEvento:        [this.parseDate(e?.fechaInicioEvento), Validators.required],
      fechaFinEvento:           [this.parseDate(e?.fechaFinEvento), Validators.required],
      fechaInicioConvocatoria:  [this.parseDate(e?.fechaInicioConvocatoria)],
      fechaFinConvocatoria:     [this.parseDate(e?.fechaFinConvocatoria)],
      diasPreEvento: [e?.diasPreEvento ?? 0, [Validators.required, Validators.min(0), Validators.max(30)]]
    }, { validators: this.fechasValidator });
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
      fechaInicioEvento:       this.toIso(v.fechaInicioEvento)!,
      fechaFinEvento:          this.toIso(v.fechaFinEvento)!,
      fechaInicioConvocatoria: this.toIso(v.fechaInicioConvocatoria),
      fechaFinConvocatoria:    this.toIso(v.fechaFinConvocatoria),
      diasPreEvento: v.diasPreEvento ?? 0
    };
    this.dialogRef.close(result);
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  private fechasValidator(group: AbstractControl): ValidationErrors | null {
    const inicio: Date | null = group.get('fechaInicioEvento')?.value;
    const fin: Date | null    = group.get('fechaFinEvento')?.value;
    const inicioConv: Date | null = group.get('fechaInicioConvocatoria')?.value;
    const finConv: Date | null    = group.get('fechaFinConvocatoria')?.value;

    const errors: ValidationErrors = {};
    if (inicio && fin && fin < inicio)           errors['finEventoAnterior'] = true;
    if (inicioConv && finConv && finConv < inicioConv) errors['finConvAnterior'] = true;
    return Object.keys(errors).length ? errors : null;
  }

  private parseDate(iso?: string): Date | null {
    if (!iso) return null;
    const [year, month, day] = iso.substring(0, 10).split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  private toIso(date: Date | null): string | undefined {
    if (!date) return undefined;
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  }
}
