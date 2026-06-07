import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { forkJoin } from 'rxjs';
import { UsuarioService } from '@app/services/usuario.service';
import { RolService } from '@app/services/rol.service';
import { AdminService } from '@app/services/admin.service';
import { UsuarioDTO } from '@app/models/usuario.model';
import { RolDTO } from '@app/models/rol.model';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';

interface UsuarioRow extends UsuarioDTO {
  rolIdEdit: number;
  guardando: boolean;
}

@Component({
  selector: 'app-admin-panel',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatFormFieldModule,
    MatTableModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatSnackBarModule,
    MatDialogModule,
    MatDividerModule,
    TranslateModule,
  ],
  templateUrl: './admin-panel.component.html',
  styleUrls: ['./admin-panel.component.scss']
})
export class AdminPanelComponent implements OnInit {
  usuarios: UsuarioRow[] = [];
  roles: RolDTO[] = [];
  loading = true;
  limpiando = false;

  readonly displayedColumns = ['nombre', 'voluntario', 'rol', 'acciones'];

  constructor(
    private usuarioService: UsuarioService,
    private rolService: RolService,
    private adminService: AdminService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    this.cargarDatos();
  }

  cargarDatos(): void {
    this.loading = true;
    forkJoin({
      usuarios: this.usuarioService.getAll(),
      roles: this.rolService.getAll(),
    }).subscribe({
      next: ({ usuarios, roles }) => {
        this.roles = roles;
        this.usuarios = usuarios.map(u => ({
          ...u,
          rolIdEdit: u.rolId,
          guardando: false,
        }));
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.snackBar.open(this.translate.instant('Admin.Snack.LoadError'), this.translate.instant('Common.Close'), { duration: 4000 });
      }
    });
  }

  guardarRol(row: UsuarioRow): void {
    if (row.rolIdEdit === row.rolId) return;
    row.guardando = true;
    this.usuarioService.cambiarRol(row.id!, row.rolIdEdit).subscribe({
      next: (updated) => {
        row.rolId      = updated.rolId;
        row.rolNombre  = updated.rolNombre;
        row.rolIdEdit  = updated.rolId;
        row.guardando  = false;
        this.snackBar.open(this.translate.instant('Admin.Snack.RoleUpdated'), this.translate.instant('Common.Close'), {
          duration: 3000, panelClass: ['success-snackbar']
        });
      },
      error: () => {
        row.guardando = false;
        this.snackBar.open(this.translate.instant('Admin.Snack.RoleUpdateError'), this.translate.instant('Common.Close'), { duration: 4000 });
      }
    });
  }

  confirmarLimpiezaBd(): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: this.translate.instant('Admin.ConfirmLimpiar.Title'),
        message: this.translate.instant('Admin.ConfirmLimpiar.Message'),
        confirmText: this.translate.instant('Admin.ConfirmLimpiar.Confirm'),
        cancelText: this.translate.instant('Common.Cancel'),
        confirmColor: 'warn',
        icon: 'warning',
      }
    });

    ref.afterClosed().subscribe(confirmado => {
      if (!confirmado) return;
      this.limpiarBd();
    });
  }

  private limpiarBd(): void {
    this.limpiando = true;
    this.adminService.limpiarBaseDatos().subscribe({
      next: () => {
        this.limpiando = false;
        this.snackBar.open(this.translate.instant('Admin.Snack.DbCleaned'), this.translate.instant('Common.Close'), {
          duration: 5000, panelClass: ['success-snackbar']
        });
        this.cargarDatos();
      },
      error: () => {
        this.limpiando = false;
        this.snackBar.open(this.translate.instant('Admin.Snack.DbCleanError'), this.translate.instant('Common.Close'), { duration: 4000 });
      }
    });
  }

  rolCambiado(row: UsuarioRow): boolean {
    return row.rolIdEdit !== row.rolId;
  }
}
