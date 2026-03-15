import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { RolService } from '../../services/rol.service';
import { RolDTO } from '../../models/rol.model';

@Component({
  selector: 'app-roles',
  standalone: true,
  imports: [CommonModule, MatTableModule, MatButtonModule, MatIconModule, MatCardModule, MatProgressSpinnerModule, MatSnackBarModule],
  template: `
    <div class="page-container">
      <div class="page-header">
        <h1>Roles</h1>
        <button mat-raised-button color="primary"><mat-icon>add</mat-icon> Nuevo Rol</button>
      </div>
      <mat-card>
        <mat-card-content>
          <div *ngIf="loading" class="loading-container"><mat-spinner></mat-spinner></div>
          <table mat-table [dataSource]="roles" *ngIf="!loading" class="full-width-table">
            <ng-container matColumnDef="id">
              <th mat-header-cell *matHeaderCellDef>ID</th>
              <td mat-cell *matCellDef="let element">{{element.id}}</td>
            </ng-container>
            <ng-container matColumnDef="nombre">
              <th mat-header-cell *matHeaderCellDef>Nombre</th>
              <td mat-cell *matCellDef="let element">{{element.nombre}}</td>
            </ng-container>
            <ng-container matColumnDef="descripcion">
              <th mat-header-cell *matHeaderCellDef>Descripción</th>
              <td mat-cell *matCellDef="let element">{{element.descripcion || '-'}}</td>
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
export class RolesComponent implements OnInit {
  roles: RolDTO[] = [];
  displayedColumns = ['id', 'nombre', 'descripcion', 'acciones'];
  loading = false;

  constructor(private rolService: RolService) {}

  ngOnInit(): void {
    this.loading = true;
    this.rolService.getAll().subscribe({
      next: (data) => { this.roles = data; this.loading = false; },
      error: () => this.loading = false
    });
  }
}

