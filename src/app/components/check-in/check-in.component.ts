import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { CheckInService } from '../../services/check-in.service';
import { CheckInDTO } from '../../models/check-in.model';
import { QrScannerDialogComponent } from './qr-scanner-dialog.component';

@Component({
  selector: 'app-check-in',
  standalone: true,
  imports: [CommonModule, MatTableModule, MatButtonModule, MatIconModule, MatCardModule, MatProgressSpinnerModule, MatSnackBarModule, MatDialogModule],
  template: `
    <div class="page-container">
      <div class="page-header">
        <h1>Check-Ins</h1>
        <button mat-raised-button color="primary" (click)="openScanner()">
          <mat-icon>qr_code_scanner</mat-icon> Escanear QR
        </button>
      </div>
      <mat-card>
        <mat-card-content>
          <div *ngIf="loading" class="loading-container"><mat-spinner></mat-spinner></div>
          <table mat-table [dataSource]="checkIns" *ngIf="!loading" class="full-width-table">
            <ng-container matColumnDef="id">
              <th mat-header-cell *matHeaderCellDef>ID</th>
              <td mat-cell *matCellDef="let element">{{element.id}}</td>
            </ng-container>
            <ng-container matColumnDef="voluntario">
              <th mat-header-cell *matHeaderCellDef>Voluntario</th>
              <td mat-cell *matCellDef="let element">{{element.voluntarioNombre}}</td>
            </ng-container>
            <ng-container matColumnDef="evento">
              <th mat-header-cell *matHeaderCellDef>Evento</th>
              <td mat-cell *matCellDef="let element">{{element.eventoNombre}}</td>
            </ng-container>
            <ng-container matColumnDef="fecha">
              <th mat-header-cell *matHeaderCellDef>Fecha/Hora</th>
              <td mat-cell *matCellDef="let element">{{element.fechaHora | date:'short'}}</td>
            </ng-container>
            <ng-container matColumnDef="observaciones">
              <th mat-header-cell *matHeaderCellDef>Observaciones</th>
              <td mat-cell *matCellDef="let element">{{element.observaciones || '-'}}</td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
          </table>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
    .loading-container { display: flex; justify-content: center; padding: 40px; }
    .full-width-table { width: 100%; }`]
})
export class CheckInComponent implements OnInit {
  checkIns: CheckInDTO[] = [];
  displayedColumns = ['id', 'voluntario', 'evento', 'fecha', 'observaciones'];
  loading = false;

  constructor(
    private checkInService: CheckInService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadCheckIns();
  }

  loadCheckIns(): void {
    this.loading = true;
    this.checkInService.getAll().subscribe({
      next: (data) => { this.checkIns = data; this.loading = false; },
      error: () => this.loading = false
    });
  }

  openScanner(): void {
    const ref = this.dialog.open(QrScannerDialogComponent, {
      width: '480px',
      disableClose: false,
      data: {}
    });

    ref.afterClosed().subscribe((result: CheckInDTO | null) => {
      if (result) {
        this.snackBar.open(
          `✅ Check-in registrado: ${result.voluntarioNombre} — ${result.eventoNombre}`,
          'Cerrar',
          { duration: 5000, panelClass: ['snack-success'] }
        );
        this.loadCheckIns();
      }
    });
  }
}

