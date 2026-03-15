import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DepartamentoService } from '../../services/departamento.service';
import { DepartamentoDTO } from '../../models/departamento.model';
import { VoluntarioDTO } from '../../models/voluntario.model';
import { VoluntarioService } from '../../services/voluntario.service';
import { DepartamentoDialogComponent } from './departamento-dialog/departamento-dialog.component';

@Component({
  selector: 'app-departamentos',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatDialogModule,
    MatTooltipModule
  ],
  templateUrl: './departamentos.component.html',
  styleUrls: ['./departamentos.component.scss']
})
export class DepartamentosComponent implements OnInit {
  departamentos: DepartamentoDTO[] = [];
  voluntarios: VoluntarioDTO[] = [];
  displayedColumns: string[] = ['id', 'nombre', 'responsable', 'auxiliares', 'acciones'];
  loading = false;

  constructor(
    private departamentoService: DepartamentoService,
    private voluntarioService: VoluntarioService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadDepartamentos();
    this.loadVoluntarios();
  }

  loadDepartamentos(): void {
    this.loading = true;
    this.departamentoService.getAll().subscribe({
      next: (data) => {
        this.departamentos = data;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error al cargar departamentos:', error);
        this.loading = false;
      }
    });
  }

  loadVoluntarios(): void {
    this.voluntarioService.getAll().subscribe({
      next: (data) => {
        this.voluntarios = data;
      },
      error: (error) => {
        console.error('Error al cargar voluntarios:', error);
      }
    });
  }

  openCreateDialog(): void {
    const dialogRef = this.dialog.open(DepartamentoDialogComponent, {
      width: '600px',
      disableClose: true,
      data: { voluntarios: this.voluntarios }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.createDepartamento(result);
      }
    });
  }

  openEditDialog(departamento: DepartamentoDTO): void {
    const dialogRef = this.dialog.open(DepartamentoDialogComponent, {
      width: '600px',
      disableClose: true,
      data: { ...departamento, voluntarios: this.voluntarios }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.updateDepartamento(result);
      }
    });
  }

  getResponsableDisplay(responsable?: string): string {
    return this.mapStoredVoluntarioValue(responsable);
  }

  getAuxiliaresDisplay(auxiliares?: string): string {
    if (!auxiliares) return '';

    return auxiliares
      .split(',')
      .map(value => this.mapStoredVoluntarioValue(value))
      .filter(Boolean)
      .join(', ');
  }

  private mapStoredVoluntarioValue(value?: string): string {
    const normalizedValue = value?.trim();
    if (!normalizedValue) return '';

    const voluntario = this.voluntarios.find(item => {
      const nombreCompleto = this.getVoluntarioNombre(item);
      return item.dni === normalizedValue || nombreCompleto === normalizedValue;
    });

    return voluntario ? this.getVoluntarioNombre(voluntario) : normalizedValue;
  }

  private getVoluntarioNombre(voluntario: VoluntarioDTO): string {
    return [voluntario.nombre, voluntario.apellido1, voluntario.apellido2]
      .filter(Boolean)
      .join(' ');
  }

  createDepartamento(departamento: DepartamentoDTO): void {
    this.loading = true;
    this.departamentoService.create(departamento).subscribe({
      next: () => {
        this.snackBar.open('Departamento creado exitosamente', 'Cerrar', {
          duration: 3000,
          panelClass: ['success-snackbar']
        });
        this.loadDepartamentos();
      },
      error: (error) => {
        console.error('Error al crear departamento:', error);
        this.loading = false;
      }
    });
  }

  updateDepartamento(departamento: DepartamentoDTO): void {
    if (!departamento.id) return;

    this.loading = true;
    this.departamentoService.update(departamento.id, departamento).subscribe({
      next: () => {
        this.snackBar.open('Departamento actualizado exitosamente', 'Cerrar', {
          duration: 3000,
          panelClass: ['success-snackbar']
        });
        this.loadDepartamentos();
      },
      error: (error) => {
        console.error('Error al actualizar departamento:', error);
        this.loading = false;
      }
    });
  }

  deleteDepartamento(departamento: DepartamentoDTO): void {
    if (!departamento.id) return;

    const confirmMessage = `¿Está seguro de eliminar el departamento "${departamento.nombre}"?`;
    if (confirm(confirmMessage)) {
      this.loading = true;
      this.departamentoService.delete(departamento.id).subscribe({
        next: () => {
          this.snackBar.open('Departamento eliminado exitosamente', 'Cerrar', {
            duration: 3000,
            panelClass: ['success-snackbar']
          });
          this.loadDepartamentos();
        },
        error: (error) => {
          console.error('Error al eliminar departamento:', error);
          this.loading = false;
        }
      });
    }
  }
}

