import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { CheckInService } from '@app/services/check-in.service';
import { CheckInDTO } from '@app/models/check-in.model';
import { QrScannerDialogComponent } from './qr-scanner-dialog.component';

@Component({
  selector: 'app-check-in',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatTableModule, MatButtonModule, MatIconModule, MatCardModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatTooltipModule,
    MatProgressSpinnerModule, MatSnackBarModule, MatDialogModule, TranslateModule
  ],
  providers: [DatePipe],
  template: `
    <div class="page-container">
      <div class="page-header">
        <h1>{{ 'CheckIn.PageTitle' | translate }}</h1>
        <button mat-raised-button color="primary" (click)="openScanner()">
          <mat-icon>qr_code_scanner</mat-icon> {{ 'CheckIn.ScanButton' | translate }}
        </button>
      </div>
      <mat-card>
        <mat-card-content>
          <div class="filters-row" *ngIf="!loading">
            <mat-form-field appearance="outline" class="filter-search">
              <mat-label>{{ 'CheckIn.Filters.Search' | translate }}</mat-label>
              <mat-icon matPrefix>search</mat-icon>
              <input matInput [(ngModel)]="filtroTexto" (ngModelChange)="aplicarFiltros()"
                     [placeholder]="'CheckIn.Filters.SearchPlaceholder' | translate">
            </mat-form-field>
            <mat-form-field appearance="outline" class="filter-select">
              <mat-label>{{ 'CheckIn.Filters.Evento' | translate }}</mat-label>
              <mat-select [(ngModel)]="filtroEvento" (ngModelChange)="aplicarFiltros()">
                <mat-option [value]="null">{{ 'CheckIn.Filters.Todos' | translate }}</mat-option>
                @for (ev of eventosUnicos; track ev) {
                  <mat-option [value]="ev">{{ ev }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline" class="filter-select">
              <mat-label>{{ 'CheckIn.Filters.Estado' | translate }}</mat-label>
              <mat-select [(ngModel)]="filtroEstado" (ngModelChange)="aplicarFiltros()">
                <mat-option [value]="null">{{ 'CheckIn.Filters.Todos' | translate }}</mat-option>
                @for (e of estadosUnicos; track e) {
                  <mat-option [value]="e">{{ etiquetaEstado(e) }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline" class="filter-select">
              <mat-label>{{ 'CheckIn.Filters.Fecha' | translate }}</mat-label>
              <input matInput type="date" [(ngModel)]="filtroFecha" (ngModelChange)="aplicarFiltros()">
            </mat-form-field>
            <button mat-stroked-button (click)="limpiarFiltros()" [disabled]="!hayFiltros"
                    class="clear-filters-btn">
              <mat-icon>filter_alt_off</mat-icon> {{ 'CheckIn.Filters.Clear' | translate }}
            </button>
          </div>

          <div *ngIf="loading" class="loading-container"><mat-spinner></mat-spinner></div>

          <table mat-table [dataSource]="checkInsFiltrados" *ngIf="!loading" class="full-width-table">
            <ng-container matColumnDef="id">
              <th mat-header-cell *matHeaderCellDef>{{ 'CheckIn.Columns.Id' | translate }}</th>
              <td mat-cell *matCellDef="let element">{{element.id}}</td>
            </ng-container>
            <ng-container matColumnDef="voluntario">
              <th mat-header-cell *matHeaderCellDef>{{ 'CheckIn.Columns.Voluntario' | translate }}</th>
              <td mat-cell *matCellDef="let element">{{element.voluntarioNombre}}</td>
            </ng-container>
            <ng-container matColumnDef="evento">
              <th mat-header-cell *matHeaderCellDef>{{ 'CheckIn.Columns.Evento' | translate }}</th>
              <td mat-cell *matCellDef="let element">{{element.eventoNombre}}</td>
            </ng-container>
            <ng-container matColumnDef="fechaCheckIn">
              <th mat-header-cell *matHeaderCellDef>{{ 'CheckIn.Columns.FechaCheckIn' | translate }}</th>
              <td mat-cell *matCellDef="let element">
                <div class="fecha-cell" *ngIf="element.fechaCheckIn; else sinFecha">
                  <span class="fecha-dia">{{element.fechaCheckIn | date:'dd/MM/yyyy'}}</span>
                  <span class="fecha-hora">{{element.fechaCheckIn | date:'HH:mm'}}</span>
                </div>
                <ng-template #sinFecha>—</ng-template>
              </td>
            </ng-container>
            <ng-container matColumnDef="fechaCheckOut">
              <th mat-header-cell *matHeaderCellDef>{{ 'CheckIn.Columns.FechaCheckOut' | translate }}</th>
              <td mat-cell *matCellDef="let element">
                <div class="fecha-cell" *ngIf="element.fechaCheckOut; else sinFecha2">
                  <span class="fecha-dia">{{element.fechaCheckOut | date:'dd/MM/yyyy'}}</span>
                  <span class="fecha-hora">{{element.fechaCheckOut | date:'HH:mm'}}</span>
                </div>
                <ng-template #sinFecha2>—</ng-template>
              </td>
            </ng-container>
            <ng-container matColumnDef="estado">
              <th mat-header-cell *matHeaderCellDef>{{ 'CheckIn.Columns.Estado' | translate }}</th>
              <td mat-cell *matCellDef="let element">
                <span class="estado-badge" [ngClass]="claseEstado(element.estado)">
                  <mat-icon class="estado-icon">{{ iconoEstado(element.estado) }}</mat-icon>
                  {{ etiquetaEstado(element.estado) }}
                </span>
              </td>
            </ng-container>
            <ng-container matColumnDef="observaciones">
              <th mat-header-cell *matHeaderCellDef>{{ 'CheckIn.Columns.Observaciones' | translate }}</th>
              <td mat-cell *matCellDef="let element">
                <span class="obs-cell" [class.obs-alerta]="esObservacionAlerta(element.observaciones)"
                      [matTooltip]="element.observaciones || ''">
                  <mat-icon *ngIf="esObservacionAlerta(element.observaciones)" class="obs-icon">warning</mat-icon>
                  {{ element.observaciones || '—' }}
                </span>
              </td>
            </ng-container>
            <ng-container matColumnDef="realizadoPor">
              <th mat-header-cell *matHeaderCellDef>{{ 'CheckIn.Columns.RealizadoPor' | translate }}</th>
              <td mat-cell *matCellDef="let element">
                <span *ngIf="element.realizadoPor" class="realizado-por-badge">
                  <mat-icon class="rp-icon">person</mat-icon>{{ element.realizadoPor }}
                </span>
                <span *ngIf="!element.realizadoPor">—</span>
              </td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
            <tr class="mat-row" *matNoDataRow>
              <td class="mat-cell empty-row" [attr.colspan]="displayedColumns.length">
                {{ 'CheckIn.Empty' | translate }}
              </td>
            </tr>
          </table>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
    .loading-container { display: flex; justify-content: center; padding: 40px; }
    .full-width-table { width: 100%; }
    .filters-row { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; margin-bottom: 8px; }
    .filter-search { flex: 2 1 220px; }
    .filter-select { flex: 1 1 160px; }
    .clear-filters-btn { margin-bottom: 20px; }
    .fecha-cell { display: flex; flex-direction: column; line-height: 1.2; }
    .fecha-dia { font-weight: 500; }
    .fecha-hora { font-size: 12px; color: #607D8B; }
    .estado-badge {
      display: inline-flex; align-items: center; gap: 4px;
      padding: 3px 10px; border-radius: 12px; font-size: 12px; font-weight: 600;
      white-space: nowrap;
    }
    .estado-icon { font-size: 15px; width: 15px; height: 15px; }
    .estado-presente   { background: #E8F5E9; color: #2E7D32; }
    .estado-completado { background: #E3F2FD; color: #1565C0; }
    .estado-progreso   { background: #FFF3E0; color: #E65100; }
    .estado-ausente    { background: #FFEBEE; color: #C62828; }
    .estado-rechazado  { background: #FFEBEE; color: #B71C1C; border: 1px solid #EF9A9A; }
    .estado-otro       { background: #ECEFF1; color: #546E7A; }
    .obs-cell { display: inline-flex; align-items: center; gap: 4px; max-width: 320px;
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .obs-alerta { color: #E65100; font-weight: 500; }
    .obs-icon { font-size: 17px; width: 17px; height: 17px; }
    .realizado-por-badge { display: inline-flex; align-items: center; gap: 3px; font-size: 13px; color: #546E7A; }
    .rp-icon { font-size: 15px; width: 15px; height: 15px; }
    .empty-row { text-align: center; padding: 24px; color: #90A4AE; }
  `]
})
export class CheckInComponent implements OnInit {
  checkIns: CheckInDTO[] = [];
  checkInsFiltrados: CheckInDTO[] = [];
  displayedColumns = ['id', 'voluntario', 'evento', 'fechaCheckIn', 'fechaCheckOut', 'estado', 'observaciones', 'realizadoPor'];
  loading = true;

  filtroTexto = '';
  filtroEvento: string | null = null;
  filtroEstado: string | null = null;
  filtroFecha: string | null = null;

  eventosUnicos: string[] = [];
  estadosUnicos: string[] = [];

  constructor(
    private checkInService: CheckInService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private translate: TranslateService,
    private datePipe: DatePipe
  ) {}

  ngOnInit(): void {
    this.loadCheckIns();
  }

  loadCheckIns(): void {
    this.loading = true;
    this.checkInService.getAll().subscribe({
      next: (data) => {
        // Más recientes primero
        this.checkIns = [...data].sort((a, b) =>
          (b.fechaCheckIn ?? '').localeCompare(a.fechaCheckIn ?? ''));
        this.eventosUnicos = [...new Set(data.map(c => c.eventoNombre).filter((e): e is string => !!e))].sort();
        this.estadosUnicos = [...new Set(data.map(c => c.estado).filter((e): e is string => !!e))].sort();
        this.aplicarFiltros();
        this.loading = false;
      },
      error: () => this.loading = false
    });
  }

  aplicarFiltros(): void {
    const texto = this.filtroTexto.trim().toLowerCase();
    this.checkInsFiltrados = this.checkIns.filter(c => {
      if (texto) {
        const blob = `${c.voluntarioNombre ?? ''} ${c.eventoNombre ?? ''} ${c.observaciones ?? ''}`.toLowerCase();
        if (!blob.includes(texto)) return false;
      }
      if (this.filtroEvento && c.eventoNombre !== this.filtroEvento) return false;
      if (this.filtroEstado && c.estado !== this.filtroEstado) return false;
      if (this.filtroFecha && (c.fechaCheckIn ?? '').slice(0, 10) !== this.filtroFecha) return false;
      return true;
    });
  }

  get hayFiltros(): boolean {
    return !!(this.filtroTexto.trim() || this.filtroEvento || this.filtroEstado || this.filtroFecha);
  }

  limpiarFiltros(): void {
    this.filtroTexto = '';
    this.filtroEvento = null;
    this.filtroEstado = null;
    this.filtroFecha = null;
    this.aplicarFiltros();
  }

  claseEstado(estado?: string): string {
    switch (estado) {
      case 'PRESENTE':    return 'estado-presente';
      case 'COMPLETADO':  return 'estado-completado';
      case 'EN_PROGRESO': return 'estado-progreso';
      case 'AUSENTE':     return 'estado-ausente';
      case 'RECHAZADO':   return 'estado-rechazado';
      default:            return 'estado-otro';
    }
  }

  iconoEstado(estado?: string): string {
    switch (estado) {
      case 'PRESENTE':    return 'check_circle';
      case 'COMPLETADO':  return 'task_alt';
      case 'EN_PROGRESO': return 'schedule';
      case 'AUSENTE':     return 'cancel';
      case 'RECHAZADO':   return 'block';
      default:            return 'help_outline';
    }
  }

  etiquetaEstado(estado?: string): string {
    if (!estado) return this.translate.instant('CheckIn.Estados.Desconocido');
    const key = `CheckIn.Estados.${estado}`;
    const traducido = this.translate.instant(key);
    return traducido === key ? estado : traducido;
  }

  /** El backend antepone mensajes automáticos cuando el check-in es fuera de tiempo/fecha o rechazado. */
  esObservacionAlerta(obs?: string): boolean {
    if (!obs) return false;
    const o = obs.toLowerCase();
    return o.includes('fuera de horario') || o.includes('anterior a la fecha')
      || o.includes('posterior a la fecha') || o.includes('acceso no permitido')
      || o.includes('ya existe un check-in');
  }

  openScanner(): void {
    const ref = this.dialog.open(QrScannerDialogComponent, {
      width: '480px',
      disableClose: false,
      data: {}
    });

    ref.afterClosed().subscribe((result: CheckInDTO | null) => {
      if (result) {
        const fecha = this.datePipe.transform(result.fechaCheckIn, 'dd/MM/yyyy HH:mm') ?? '';
        this.snackBar.open(
          this.translate.instant('CheckIn.Snack.Success', { volunteer: result.voluntarioNombre, event: result.eventoNombre, date: fecha }),
          this.translate.instant('Common.Close'),
          { duration: 5000, panelClass: ['snack-success'] }
        );
        this.loadCheckIns();
      }
    });
  }
}
