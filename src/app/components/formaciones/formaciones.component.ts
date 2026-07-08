import { Component, ElementRef, Inject, OnInit, TemplateRef, ViewChild } from '@angular/core';
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
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { FormacionService } from '@app/services/formacion.service';
import { FormacionDTO } from '@app/models/formacion.model';
import { EventoService } from '@app/services/evento.service';
import { EventoDTO } from '@app/models/evento.model';
import { VoluntarioService } from '@app/services/voluntario.service';
import { VoluntarioDTO } from '@app/models/voluntario.model';
import { DataTableComponent } from '../data-table/data-table/data-table.component';
import { ColumnDef, TableActionEvent } from '@app/@core';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';
import { CargaMasivaResultadoDialogComponent } from '../voluntarios/voluntarios.component';

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
    MatDialogModule, MatFormFieldModule, MatSelectModule, MatButtonModule, MatIconModule,
    TranslateModule
  ],
  template: `
    <h2 mat-dialog-title>{{ 'Formaciones.RegistrarDialog.Title' | translate }}</h2>
    <mat-dialog-content>
      <form [formGroup]="form" style="min-width:340px; padding-top:8px">
        <mat-form-field appearance="outline" style="width:100%">
          <mat-label>{{ 'Formaciones.RegistrarDialog.VoluntarioLabel' | translate }}</mat-label>
          <mat-select formControlName="voluntarioId" required>
            <mat-option *ngFor="let v of data.voluntarios" [value]="v.id">
              {{ v.apellido1 }} {{ v.apellido2 }} {{ v.nombre }} — {{ v.dni }}
            </mat-option>
          </mat-select>
          <mat-error>{{ 'Formaciones.RegistrarDialog.VoluntarioRequired' | translate }}</mat-error>
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="dialogRef.close()">{{ 'Common.Cancel' | translate }}</button>
      <button mat-raised-button color="primary" (click)="onSave()" [disabled]="!form.valid">
        <mat-icon>add</mat-icon> {{ 'Formaciones.RegistrarDialog.RegisterButton' | translate }}
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
    TranslateModule,
  ],
  templateUrl: './formaciones.component.html',
  styleUrls: ['./formaciones.component.scss']
})
export class FormacionesComponent implements OnInit {
  @ViewChild('aprobadaTpl', { static: false }) aprobadaTpl!: TemplateRef<{ $implicit: any }>;
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  eventosFormacion: EventoDTO[] = [];
  eventoSeleccionado: EventoDTO | null = null;
  registros: any[] = [];
  voluntarios: VoluntarioDTO[] = [];
  columns: ColumnDef[] = [];

  loading = false;
  loadingRegistros = false;
  importando = false;

  constructor(
    private formacionService: FormacionService,
    private eventoService: EventoService,
    private voluntarioService: VoluntarioService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    this.loading = true;
    this.eventoService.getByTipo('FORMACION').subscribe({
      next: (data) => { this.eventosFormacion = data; this.loading = false; },
      error: () => { this.loading = false; this.showError(this.translate.instant('Formaciones.Snack.LoadEventsError')); },
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
      { key: 'voluntarioNombre', header: this.translate.instant('Formaciones.Columns.Voluntario'), type: 'text', filterType: 'text', sortable: true },
      { key: 'voluntarioDni', header: this.translate.instant('Formaciones.Columns.Dni'), type: 'text', filterType: 'text' },
      {
        key: 'asistioLabel', header: this.translate.instant('Formaciones.Columns.Asistio'), type: 'badge',
        badgeMap: { [this.translate.instant('Formaciones.Badges.Si')]: 'dt-badge--success', [this.translate.instant('Formaciones.Badges.No')]: 'dt-badge--neutral' },
      },
      { key: 'aprobada', header: this.translate.instant('Formaciones.Columns.Aprobada'), type: 'custom', cellTemplate: this.aprobadaTpl },
      {
        key: 'acciones', header: this.translate.instant('Formaciones.Columns.Actions'), type: 'actions', sticky: 'end',
        actions: [
          { id: 'delete', icon: 'delete', label: this.translate.instant('Formaciones.Actions.Delete'), color: 'warn' },
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
          asistioLabel: r.asistio ? this.translate.instant('Formaciones.Badges.Si') : this.translate.instant('Formaciones.Badges.No'),
        }));
        this.loadingRegistros = false;
      },
      error: () => { this.loadingRegistros = false; this.showError(this.translate.instant('Formaciones.Snack.LoadError')); },
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
        this.showSuccess(nuevoValor ? this.translate.instant('Formaciones.Snack.Approved') : this.translate.instant('Formaciones.Snack.Unapproved'));
      },
      error: () => this.showError(this.translate.instant('Formaciones.Snack.UpdateError')),
    });
  }

  confirmEliminar(registro: FormacionDTO): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '420px',
      data: {
        title: this.translate.instant('Formaciones.ConfirmDelete.Title'),
        message: this.translate.instant('Formaciones.ConfirmDelete.Message', { name: registro.voluntarioNombre }),
        confirmText: this.translate.instant('Formaciones.ConfirmDelete.Confirm'),
        confirmColor: 'warn',
        icon: 'delete',
      },
    });
    ref.afterClosed().subscribe((ok: boolean) => { if (ok) this.eliminar(registro); });
  }

  eliminar(registro: FormacionDTO): void {
    this.formacionService.delete(registro.id!).subscribe({
      next: () => { this.showSuccess(this.translate.instant('Formaciones.Snack.Deleted')); this.cargarRegistros(); },
      error: () => this.showError(this.translate.instant('Formaciones.Snack.DeleteError')),
    });
  }

  countAsistio(): number   { return this.registros.filter(r => r.asistio).length; }
  countAprobados(): number { return this.registros.filter(r => r.aprobada).length; }

  abrirImportacion(): void {
    this.fileInput.nativeElement.value = '';
    this.fileInput.nativeElement.click();
  }

  onArchivoSeleccionado(event: Event): void {
    const input = event.target as HTMLInputElement;
    const archivo = input.files?.[0];
    if (!archivo || !this.eventoSeleccionado?.id) return;

    if (archivo.name.toLowerCase() !== 'formaciones.xlsx') {
      this.showError(this.translate.instant('Formaciones.Snack.WrongFilename'));
      return;
    }

    this.importando = true;
    this.eventoService.importarExcel(this.eventoSeleccionado.id, archivo).subscribe({
      next: (resultado) => {
        this.importando = false;
        this.dialog.open(CargaMasivaResultadoDialogComponent, { width: '750px', data: resultado });
        this.cargarRegistros();
      },
      error: (err) => {
        this.importando = false;
        const msg = err?.error?.message ?? this.translate.instant('Formaciones.Snack.ImportError');
        this.showError(msg);
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
