import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { EventoService } from '../../services/evento.service';
import { EventoDTO } from '../../models/evento.model';

@Component({
  selector: 'app-eventos',
  standalone: true,
  imports: [CommonModule, MatTableModule, MatButtonModule, MatIconModule, MatCardModule, MatProgressSpinnerModule, MatSnackBarModule],
  template: `
    <div class="page-container">
      <div class="page-header">
        <h1>Eventos</h1>
        <button mat-raised-button color="primary"><mat-icon>add</mat-icon> Nuevo Evento</button>
      </div>
      <mat-card>
        <mat-card-content>
          <div *ngIf="loading" class="loading-container"><mat-spinner></mat-spinner></div>
          <table mat-table [dataSource]="eventos" *ngIf="!loading" class="full-width-table">
            <ng-container matColumnDef="id">
              <th mat-header-cell *matHeaderCellDef>ID</th>
              <td mat-cell *matCellDef="let element">{{element.id}}</td>
            </ng-container>
            <ng-container matColumnDef="nombre">
              <th mat-header-cell *matHeaderCellDef>Nombre</th>
              <td mat-cell *matCellDef="let element">{{element.nombre}}</td>
            </ng-container>
            <ng-container matColumnDef="tipo">
              <th mat-header-cell *matHeaderCellDef>Tipo</th>
              <td mat-cell *matCellDef="let element">{{element.tipoEvento || '-'}}</td>
            </ng-container>
            <ng-container matColumnDef="fechas">
              <th mat-header-cell *matHeaderCellDef>Fechas</th>
              <td mat-cell *matCellDef="let element">{{element.fechaInicio | date:'short'}} - {{element.fechaFin | date:'short'}}</td>
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
export class EventosComponent implements OnInit {
  eventos: EventoDTO[] = [];
  displayedColumns = ['id', 'nombre', 'tipo', 'fechas', 'acciones'];
  loading = false;

  constructor(private eventoService: EventoService) {}

  ngOnInit(): void {
    this.loading = true;
    this.eventoService.getAll().subscribe({
      next: (data) => { this.eventos = data; this.loading = false; },
      error: () => this.loading = false
    });
  }
}

