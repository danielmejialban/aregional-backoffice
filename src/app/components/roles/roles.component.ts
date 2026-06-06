import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { PageEvent } from '@angular/material/paginator';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { RolService } from '@app/services/rol.service';
import { RolDTO } from '@app/models/rol.model';
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
    TranslateModule,
  ],
  template: `
    <div class="page-container">
      <div class="page-header">
        <h1>{{ 'Roles.PageTitle' | translate }}</h1>
        <button mat-raised-button color="primary">
          <mat-icon>add</mat-icon> {{ 'Roles.NewButton' | translate }}
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
  columns: ColumnDef[] = [];
  loading = false;
  totalElements = 0;
  pageSize = 10;
  currentPage = 0;
  private nombre = '';

  constructor(
    private rolService: RolService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private translate: TranslateService
  ) {}

  private buildColumns(): ColumnDef[] {
    return [
      { key: 'id', header: this.translate.instant('Roles.Columns.Id'), type: 'text', width: '60px' },
      { key: 'nombre', header: this.translate.instant('Roles.Columns.Nombre'), type: 'text', filterType: 'text', sortable: true },
      { key: 'descripcion', header: this.translate.instant('Roles.Columns.Descripcion'), type: 'text' },
      {
        key: 'acciones', header: this.translate.instant('Roles.Columns.Actions'), type: 'actions', sticky: 'end',
        actions: [
          { id: 'edit', icon: 'edit', label: this.translate.instant('Roles.Actions.Edit'), color: 'primary' },
          { id: 'delete', icon: 'delete', label: this.translate.instant('Roles.Actions.Delete'), color: 'warn' },
        ],
      },
    ];
  }

  ngOnInit(): void {
    this.columns = this.buildColumns();
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
        title: this.translate.instant('Roles.ConfirmDelete.Title'),
        message: this.translate.instant('Roles.ConfirmDelete.Message', { name: rol.nombre }),
        confirmText: this.translate.instant('Roles.ConfirmDelete.Confirm'),
        confirmColor: 'warn',
        icon: 'delete',
      },
    });
    ref.afterClosed().subscribe((ok: boolean) => {
      if (ok) {
        this.snackBar.open(this.translate.instant('Roles.Snack.DeletePending'), this.translate.instant('Common.Close'), { duration: 3000 });
      }
    });
  }
}
