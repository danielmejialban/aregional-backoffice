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
@Component({
  selector: 'app-carga-masiva-resultado-dialog',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatTableModule, MatChipsModule, MatDialogModule],
  template: `
    <h2 mat-dialog-title>Resultado de la carga masiva</h2>
    <mat-dialog-content>
      <div class="resumen">
        <span class="chip creado">✔ Creados: {{ data.creados }}</span>
        <span class="chip omitido">⚠ Omitidos: {{ data.omitidos }}</span>
        <span class="chip error">✖ Errores: {{ data.errores }}</span>
        <span class="chip total">Total filas: {{ data.totalFilas }}</span>
      </div>
      <table mat-table [dataSource]="detalleFiltrado" class="detalle-table" *ngIf="detalleFiltrado.length > 0">
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
          <th mat-header-cell *matHeaderCellDef>DNI</th>
          <td mat-cell *matCellDef="let r">{{ r.dni || '-' }}</td>
        </ng-container>
        <ng-container matColumnDef="mensaje">
          <th mat-header-cell *matHeaderCellDef>Mensaje</th>
          <td mat-cell *matCellDef="let r">{{ r.mensaje }}</td>
        </ng-container>
        <tr mat-header-row *matHeaderRowDef="cols"></tr>
        <tr mat-row *matRowDef="let row; columns: cols;"></tr>
      </table>
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
    .detalle-table { width: 100%; }
  `]
})
export class CargaMasivaResultadoDialogComponent {
  cols = ['fila', 'estado', 'dni', 'mensaje'];
  detalleFiltrado: FilaResultadoDTO[];

  constructor(
    public dialogRef: MatDialogRef<CargaMasivaResultadoDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: CargaMasivaResultadoDTO
  ) {
    // Mostrar solo omitidos y errores en el detalle (los creados no aportan info extra)
    this.detalleFiltrado = data.detalle.filter(f => f.estado !== 'CREADO');
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

