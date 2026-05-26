import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { PageEvent } from '@angular/material/paginator';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RolService } from '../../services/rol.service';
import { RolDTO } from '../../models/rol.model';
import { DataTableComponent } from '../data-table/data-table/data-table.component';
import { ColumnDef, TableActionEvent, ActiveFilters } from '@app/@core';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-roles',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule, MatIconModule, MatCardModule,
    MatSnackBarModule, MatDialogModule,
    DataTableComponent,
  ],
  template: `
    <div class="page-container">
      <div class="page-header">
        <h1>Roles</h1>
        <button mat-raised-button color="primary">
          <mat-icon>add</mat-icon> Nuevo Rol
        </button>
      </div>

      <mat-card>
        <mat-card-content>
          <app-data-table
            [columns]="columns"
            [data]="roles"
            [isLoading]="loading"
            [serverSide]="true"
            [totalItems]="totalElements"
            [pageSize]="pageSize"
            [pageIndex]="currentPage"
            [pageSizeOptions]="[10, 25, 50]"
            (filterChange)="onFilterChange($event)"
            (pageChange)="onPageChange($event)"
            (actionClick)="onActionClick($event)"
          />
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }
  `]
})
export class RolesComponent implements OnInit {
  roles: RolDTO[] = [];
  columns: ColumnDef[] = [
    { key: 'id', header: 'ID', type: 'text', width: '60px' },
    { key: 'nombre', header: 'Nombre', type: 'text', filterType: 'text', sortable: true },
    { key: 'descripcion', header: 'Descripción', type: 'text' },
    {
      key: 'acciones', header: 'Acciones', type: 'actions', sticky: 'end',
      actions: [
        { id: 'edit', icon: 'edit', label: 'Editar', color: 'primary' },
        { id: 'delete', icon: 'delete', label: 'Eliminar', color: 'warn' },
      ],
    },
  ];
  loading = false;
  totalElements = 0;
  pageSize = 10;
  currentPage = 0;
  private nombre = '';
  private readonly destroyRef = inject(DestroyRef);

  constructor(
    private rolService: RolService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadRoles();
  }

  loadRoles(page = this.currentPage): void {
    this.currentPage = page;
    this.loading = true;
    this.rolService.getAllPaged(page, this.pageSize, this.nombre).subscribe({
      next: (data) => {
        this.roles = data.content;
        this.totalElements = data.totalElements;
        this.loading = false;
      },
      error: () => this.loading = false,
    });
  }

  onFilterChange(filters: ActiveFilters): void {
    this.nombre = (filters['nombre'] as string) || '';
    this.loadRoles(0);
  }

  onPageChange(event: PageEvent): void {
    this.pageSize = event.pageSize;
    this.loadRoles(event.pageIndex);
  }

  onActionClick(event: TableActionEvent): void {
    const rol = event.row as RolDTO;
    if (event.action === 'delete') {
      this.confirmDelete(rol);
    }
  }

  confirmDelete(rol: RolDTO): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '420px',
      data: {
        title: 'Eliminar rol',
        message: `¿Estás seguro de que quieres eliminar el rol "${rol.nombre}"?`,
        confirmText: 'Eliminar',
        confirmColor: 'warn',
        icon: 'delete',
      },
    });
    ref.afterClosed().subscribe((ok: boolean) => {
      if (ok) {
        this.snackBar.open('Funcionalidad de eliminar rol pendiente de implementar', 'Cerrar', { duration: 3000 });
      }
    });
  }
}
