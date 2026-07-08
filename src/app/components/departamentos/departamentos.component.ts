import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { forkJoin } from 'rxjs';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { DepartamentoService } from '@app/services/departamento.service';
import { DepartamentoDTO } from '@app/models/departamento.model';
import { VoluntarioDTO } from '@app/models/voluntario.model';
import { VoluntarioService } from '@app/services/voluntario.service';
import { DepartamentoDialogComponent } from './departamento-dialog/departamento-dialog.component';
import { DataTableComponent } from '../data-table/data-table/data-table.component';
import { ColumnDef, TableActionEvent } from '@app/@core';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';
import { PlantillaExcelService } from '@app/services/plantilla-excel.service';

@Component({
  selector: 'app-departamentos',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule, MatIconModule, MatCardModule,
    MatSnackBarModule, MatDialogModule, MatTooltipModule,
    DataTableComponent,
    TranslateModule,
  ],
  templateUrl: './departamentos.component.html',
  styleUrls: ['./departamentos.component.scss']
})
export class DepartamentosComponent implements OnInit {
  tableData: any[] = [];
  voluntarios: VoluntarioDTO[] = [];
  loading = false;

  columns: ColumnDef[] = [];

  constructor(
    private departamentoService: DepartamentoService,
    private voluntarioService: VoluntarioService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private translate: TranslateService,
    private plantillaExcelService: PlantillaExcelService,
  ) {}

  private buildColumns(): ColumnDef[] {
    return [
      { key: 'id', header: this.translate.instant('Departamentos.Columns.Id'), type: 'text', width: '60px' },
      { key: 'nombre', header: this.translate.instant('Departamentos.Columns.Nombre'), type: 'text', filterType: 'text', sortable: true },
      { key: 'responsableDisplay', header: this.translate.instant('Departamentos.Columns.Responsable'), type: 'text' },
      { key: 'auxiliaresDisplay', header: this.translate.instant('Departamentos.Columns.Auxiliares'), type: 'text' },
      {
        key: 'acciones', header: this.translate.instant('Departamentos.Columns.Actions'), type: 'actions', sticky: 'end',
        actions: [
          { id: 'edit', icon: 'edit', label: this.translate.instant('Departamentos.Actions.Edit'), color: 'primary' },
          { id: 'delete', icon: 'delete', label: this.translate.instant('Departamentos.Actions.Delete'), color: 'warn' },
        ],
      },
    ];
  }

  ngOnInit(): void {
    this.columns = this.buildColumns();
    this.loading = true;
    forkJoin({
      departamentos: this.departamentoService.getAll(),
      voluntarios:   this.voluntarioService.getAll(),
    }).subscribe({
      next: ({ departamentos, voluntarios }) => {
        this.voluntarios = this.toArray(voluntarios);
        this.tableData   = departamentos.map(d => ({
          ...d,
          responsableDisplay: this.getResponsableDisplay(d.responsable),
          auxiliaresDisplay:  this.getAuxiliaresDisplay(d.auxiliares),
        }));
        this.loading = false;
      },
      error: () => { this.loading = false; this.showError(this.translate.instant('Departamentos.Snack.LoadError')); },
    });
  }

  onActionClick(event: TableActionEvent): void {
    const d = event.row as DepartamentoDTO;
    if (event.action === 'edit') {
      this.openEditDialog(d);
    } else if (event.action === 'delete') {
      this.confirmDelete(d);
    }
  }

  openCreateDialog(): void {
    const ref = this.dialog.open(DepartamentoDialogComponent, {
      width: '600px', disableClose: true,
      data: { voluntarios: this.voluntarios },
    });
    ref.afterClosed().subscribe(result => { if (result) this.createDepartamento(result); });
  }

  openEditDialog(departamento: DepartamentoDTO): void {
    const ref = this.dialog.open(DepartamentoDialogComponent, {
      width: '600px', disableClose: true,
      data: { ...departamento, voluntarios: this.voluntarios },
    });
    ref.afterClosed().subscribe(result => { if (result) this.updateDepartamento(result); });
  }

  confirmDelete(departamento: DepartamentoDTO): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '420px',
      data: {
        title: this.translate.instant('Departamentos.ConfirmDelete.Title'),
        message: this.translate.instant('Departamentos.ConfirmDelete.Message', { name: departamento.nombre }),
        confirmText: this.translate.instant('Departamentos.ConfirmDelete.Confirm'),
        confirmColor: 'warn',
        icon: 'delete',
      },
    });
    ref.afterClosed().subscribe((ok: boolean) => { if (ok) this.deleteDepartamento(departamento); });
  }

  createDepartamento(departamento: DepartamentoDTO): void {
    this.loading = true;
    this.departamentoService.create(departamento).subscribe({
      next: () => { this.showSuccess(this.translate.instant('Departamentos.Snack.Created')); this.reloadAll(); },
      error: () => { this.loading = false; this.showError(this.translate.instant('Departamentos.Snack.CreateError')); },
    });
  }

  updateDepartamento(departamento: DepartamentoDTO): void {
    if (!departamento.id) return;
    this.loading = true;
    this.departamentoService.update(departamento.id, departamento).subscribe({
      next: () => { this.showSuccess(this.translate.instant('Departamentos.Snack.Updated')); this.reloadAll(); },
      error: () => { this.loading = false; this.showError(this.translate.instant('Departamentos.Snack.UpdateError')); },
    });
  }

  deleteDepartamento(departamento: DepartamentoDTO): void {
    if (!departamento.id) return;
    this.loading = true;
    this.departamentoService.delete(departamento.id).subscribe({
      next: () => { this.showSuccess(this.translate.instant('Departamentos.Snack.Deleted')); this.reloadAll(); },
      error: () => { this.loading = false; this.showError(this.translate.instant('Departamentos.Snack.DeleteError')); },
    });
  }

  private reloadAll(): void {
    this.loading = true;
    forkJoin({
      departamentos: this.departamentoService.getAll(),
      voluntarios:   this.voluntarioService.getAll(),
    }).subscribe({
      next: ({ departamentos, voluntarios }) => {
        this.voluntarios = this.toArray(voluntarios);
        this.tableData   = departamentos.map(d => ({
          ...d,
          responsableDisplay: this.getResponsableDisplay(d.responsable),
          auxiliaresDisplay:  this.getAuxiliaresDisplay(d.auxiliares),
        }));
        this.loading = false;
      },
      error: () => { this.loading = false; },
    });
  }

  private toArray(response: any): VoluntarioDTO[] {
    if (Array.isArray(response)) return response;
    if (response?.content && Array.isArray(response.content)) return response.content;
    return [];
  }

  private getResponsableDisplay(responsable?: string): string {
    return this.mapVoluntarioValue(responsable);
  }

  private getAuxiliaresDisplay(auxiliares?: string): string {
    if (!auxiliares) return '';
    return auxiliares
      .split(',')
      .map(v => this.mapVoluntarioValue(v))
      .filter(Boolean)
      .join(', ');
  }

  private mapVoluntarioValue(value?: string): string {
    const v = value?.trim();
    if (!v) return '';
    const found = this.voluntarios.find(vol =>
      vol.dni === v || this.getVolNombre(vol) === v
    );
    return found ? this.getVolNombre(found) : v;
  }

  private getVolNombre(v: VoluntarioDTO): string {
    return [v.nombre, v.apellido1, v.apellido2].filter(Boolean).join(' ');
  }

  async exportarExcel(): Promise<void> {
    try {
      const departamentos = this.tableData as DepartamentoDTO[];
      await this.plantillaExcelService.exportarDepartamentos(departamentos, this.voluntarios);
    } catch (e) {
      console.error('[exportarExcel]', e);
      this.showError(this.translate.instant('Departamentos.Snack.ExportError'));
    }
  }

  private showSuccess(msg: string): void {
    this.snackBar.open(msg, this.translate.instant('Common.Close'), { duration: 3000, panelClass: ['success-snackbar'] });
  }

  private showError(msg: string): void {
    this.snackBar.open(msg, this.translate.instant('Common.Close'), { duration: 4000, panelClass: ['error-snackbar'] });
  }
}
