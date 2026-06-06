import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { EventoService } from '@app/services/evento.service';
import { EventoDTO } from '@app/models/evento.model';
import { EventoDialogComponent } from './evento-dialog/evento-dialog.component';
import { DataTableComponent } from '../data-table/data-table/data-table.component';
import { ColumnDef, TableActionEvent } from '@app/@core';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-eventos',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule, MatIconModule, MatCardModule,
    MatSnackBarModule, MatDialogModule, MatTooltipModule,
    DataTableComponent,
    TranslateModule,
  ],
  templateUrl: './eventos.component.html',
  styleUrls: ['./eventos.component.scss']
})
export class EventosComponent implements OnInit {
  eventos: EventoDTO[] = [];
  loading = false;

  columns: ColumnDef[] = [];

  constructor(
    private eventoService: EventoService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private translate: TranslateService
  ) {}

  private buildColumns(): ColumnDef[] {
    return [
      { key: 'id', header: this.translate.instant('Eventos.Columns.Id'), type: 'text', width: '60px' },
      { key: 'nombre', header: this.translate.instant('Eventos.Columns.Nombre'), type: 'text', filterType: 'text', sortable: true },
      {
        key: 'tipoEvento', header: this.translate.instant('Eventos.Columns.Tipo'), type: 'badge',
        filterType: 'select',
        filterOptions: ['ASAMBLEA', 'FORMACION', 'ESPECIAL'],
        badgeMap: {
          'ASAMBLEA': 'dt-badge--primary',
          'FORMACION': 'dt-badge--success',
          'ESPECIAL':  'dt-badge--accent',
        },
      },
      {
        key: 'fechaInicioEvento', header: this.translate.instant('Eventos.Columns.Inicio'), type: 'date',
        dateFormat: 'dd/MM/yyyy HH:mm',
      },
      {
        key: 'fechaFinEvento', header: this.translate.instant('Eventos.Columns.Fin'), type: 'date',
        dateFormat: 'dd/MM/yyyy HH:mm',
      },
      { key: 'direccion', header: this.translate.instant('Eventos.Columns.Direccion'), type: 'text', hidden: true },
      {
        key: 'acciones', header: this.translate.instant('Eventos.Columns.Actions'), type: 'actions', sticky: 'end',
        actions: [
          { id: 'edit', icon: 'edit', label: this.translate.instant('Eventos.Actions.Edit'), color: 'primary' },
          { id: 'delete', icon: 'delete', label: this.translate.instant('Eventos.Actions.Delete'), color: 'warn' },
        ],
      },
    ];
  }

  ngOnInit(): void {
    this.columns = this.buildColumns();
    this.loadEventos();
  }

  loadEventos(): void {
    this.loading = true;
    this.eventoService.getAll().subscribe({
      next: (data) => { this.eventos = data; this.loading = false; },
      error: () => { this.loading = false; this.showError(this.translate.instant('Eventos.Snack.LoadError')); },
    });
  }

  onActionClick(event: TableActionEvent): void {
    const e = event.row as EventoDTO;
    if (event.action === 'edit') {
      this.openEditDialog(e);
    } else if (event.action === 'delete') {
      this.confirmDelete(e);
    }
  }

  openCreateDialog(): void {
    const ref = this.dialog.open(EventoDialogComponent, {
      width: '620px', disableClose: true, data: {},
    });
    ref.afterClosed().subscribe(result => { if (result) this.createEvento(result); });
  }

  openEditDialog(evento: EventoDTO): void {
    const ref = this.dialog.open(EventoDialogComponent, {
      width: '620px', disableClose: true, data: { evento },
    });
    ref.afterClosed().subscribe(result => { if (result) this.updateEvento(result); });
  }

  confirmDelete(evento: EventoDTO): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '420px',
      data: {
        title: this.translate.instant('Eventos.ConfirmDelete.Title'),
        message: this.translate.instant('Eventos.ConfirmDelete.Message', { name: evento.nombre }),
        confirmText: this.translate.instant('Eventos.ConfirmDelete.Confirm'),
        confirmColor: 'warn',
        icon: 'delete',
      },
    });
    ref.afterClosed().subscribe((ok: boolean) => { if (ok) this.deleteEvento(evento); });
  }

  createEvento(evento: EventoDTO): void {
    this.loading = true;
    this.eventoService.create(evento).subscribe({
      next: () => { this.showSuccess(this.translate.instant('Eventos.Snack.Created')); this.loadEventos(); },
      error: () => { this.loading = false; this.showError(this.translate.instant('Eventos.Snack.CreateError')); },
    });
  }

  updateEvento(evento: EventoDTO): void {
    if (!evento.id) return;
    this.loading = true;
    this.eventoService.update(evento.id, evento).subscribe({
      next: () => { this.showSuccess(this.translate.instant('Eventos.Snack.Updated')); this.loadEventos(); },
      error: () => { this.loading = false; this.showError(this.translate.instant('Eventos.Snack.UpdateError')); },
    });
  }

  deleteEvento(evento: EventoDTO): void {
    this.loading = true;
    this.eventoService.delete(evento.id!).subscribe({
      next: () => { this.showSuccess(this.translate.instant('Eventos.Snack.Deleted')); this.loadEventos(); },
      error: () => { this.loading = false; this.showError(this.translate.instant('Eventos.Snack.DeleteError')); },
    });
  }

  private showSuccess(msg: string): void {
    this.snackBar.open(msg, this.translate.instant('Common.Close'), { duration: 3000, panelClass: ['success-snackbar'] });
  }

  private showError(msg: string): void {
    this.snackBar.open(msg, this.translate.instant('Common.Close'), { duration: 4000, panelClass: ['error-snackbar'] });
  }
}
