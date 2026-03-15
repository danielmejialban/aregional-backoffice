import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { EventoVoluntarioService } from '../../services/evento-voluntario.service';
import { EventoVoluntarioDTO } from '../../models/evento-voluntario.model';

@Component({
  selector: 'app-evento-voluntarios',
  standalone: true,
  imports: [CommonModule, MatTableModule, MatButtonModule, MatIconModule, MatCardModule, MatProgressSpinnerModule, MatSnackBarModule],
  template: `
    <div class="page-container">
      <div class="page-header">
        <h1>Asignaciones Evento-Voluntario</h1>
        <button mat-raised-button color="primary"><mat-icon>add</mat-icon> Nueva Asignación</button>
      </div>
      <mat-card>
        <mat-card-content>
          <div *ngIf="loading" class="loading-container"><mat-spinner></mat-spinner></div>
          <table mat-table [dataSource]="asignaciones" *ngIf="!loading" class="full-width-table">
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
            <ng-container matColumnDef="qr">
              <th mat-header-cell *matHeaderCellDef>QR</th>
              <td mat-cell *matCellDef="let element">
                <button mat-icon-button color="primary" *ngIf="element.qrImageBase64">
                  <mat-icon>qr_code</mat-icon>
                </button>
              </td>
            </ng-container>
            <ng-container matColumnDef="acciones">
              <th mat-header-cell *matHeaderCellDef>Acciones</th>
              <td mat-cell *matCellDef="let element">
                <button mat-icon-button color="primary"><mat-icon>edit</mat-icon></button>
                <button mat-icon-button color="warn"><mat-icon>delete</mat-icon></button>
              </td>
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
export class EventoVoluntariosComponent implements OnInit {
  asignaciones: EventoVoluntarioDTO[] = [];
  displayedColumns = ['id', 'voluntario', 'evento', 'qr', 'acciones'];
  loading = false;

  constructor(private eventoVoluntarioService: EventoVoluntarioService) {}

  ngOnInit(): void {
    this.loading = true;
    this.eventoVoluntarioService.getAll().subscribe({
      next: (data) => { this.asignaciones = data; this.loading = false; },
      error: () => this.loading = false
    });
  }
}

