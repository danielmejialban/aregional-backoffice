import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { Inject } from '@angular/core';
import { VoluntarioService } from '../../services/voluntario.service';
import { VoluntarioDTO } from '../../models/voluntario.model';
import { CargaMasivaResultadoDTO, FilaResultadoDTO } from '../../models/carga-masiva-resultado.model';

// ── Diálogo de resultado ────────────────────────────────────────────────────
import { MatTabsModule } from '@angular/material/tabs';

@Component({
  selector: 'app-carga-masiva-resultado-dialog',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatTableModule, MatChipsModule, MatDialogModule, MatTabsModule, MatIconModule],
  template: `
    <h2 mat-dialog-title>Resultado de la carga masiva</h2>
    <mat-dialog-content>
      <!-- Resumen -->
      <div class="resumen">
        <span class="chip total">📋 Total: {{ data.totalFilas }}</span>
        <span class="chip creado">✔ Creados: {{ data.creados }}</span>
        <span class="chip omitido">⚠ Omitidos: {{ data.omitidos }}</span>
        <span class="chip error">✖ Errores: {{ data.errores }}</span>
      </div>
      <!-- Pestañas por estado -->
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
      <!-- Template reutilizable de tabla -->
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

// ── Componente principal ────────────────────────────────────────────────────
@Component({
  selector: 'app-voluntarios',
  standalone: true,
  imports: [
    CommonModule, MatTableModule, MatButtonModule, MatIconModule,
    MatCardModule, MatProgressSpinnerModule, MatSnackBarModule,
    MatDialogModule, MatTooltipModule
  ],
  templateUrl: './voluntarios.component.html',
  styleUrls: ['./voluntarios.component.scss']
})
export class VoluntariosComponent implements OnInit {
  @ViewChild('csvInput') csvInput!: ElementRef<HTMLInputElement>;

  voluntarios: VoluntarioDTO[] = [];
  displayedColumns = ['id', 'nombre', 'dni', 'departamento', 'acciones'];
  loading = false;
  subiendoCsv = false;

  constructor(
    private voluntarioService: VoluntarioService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadVoluntarios();
  }

  loadVoluntarios(): void {
    this.loading = true;
    this.voluntarioService.getAll().subscribe({
      next: (data) => { this.voluntarios = data; this.loading = false; },
      error: () => { this.loading = false; this.showError('Error al cargar voluntarios'); }
    });
  }

  abrirSelectorCsv(): void {
    this.csvInput.nativeElement.value = '';
    this.csvInput.nativeElement.click();
  }

  descargarPlantillaCsv(): void {
    const cabecera = 'nombre,apellido1,apellido2,dni,telefono,email,departamento,responsable,auxiliares';
    // auxiliares entre comillas porque contiene comas (RFC 4180)
    const ejemplo  = 'Juan,García,López,12345678A,+34 612 345 678,juan.garcia@email.com,Acomodación,98765432B,"11111111C,22222222D"';
    const contenido = `${cabecera}\n${ejemplo}\n`;
    const blob = new Blob([contenido], { type: 'text/csv;charset=utf-8;' });
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
        this.dialog.open(CargaMasivaResultadoDialogComponent, {
          width: '750px',
          data: resultado
        });
      },
      error: (err) => {
        this.subiendoCsv = false;
        const msg = err?.error?.message || 'Error al procesar el CSV';
        this.showError(msg);
      }
    });
  }

  private showError(msg: string): void {
    this.snackBar.open(msg, 'Cerrar', { duration: 4000, panelClass: ['error-snackbar'] });
  }
}

