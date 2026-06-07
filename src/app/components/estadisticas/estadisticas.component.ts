import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslateModule } from '@ngx-translate/core';
import { BaseChartDirective } from 'ng2-charts';
import { ChartData, ChartOptions } from 'chart.js';
import { Workbook } from 'exceljs';
import { CheckInService } from '@app/services/check-in.service';
import { EstadisticasService } from '@app/services/estadisticas.service';
import { ItemConteoDTO } from '@app/models/estadisticas.model';
import { CheckInDTO } from '@app/models/check-in.model';

export interface DiaRow {
  fecha: string;
  cantidad: number;
}

@Component({
  selector: 'app-estadisticas',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatTableModule,
    MatProgressSpinnerModule,
    TranslateModule,
    BaseChartDirective,
  ],
  templateUrl: './estadisticas.component.html',
  styleUrls: ['./estadisticas.component.scss']
})
export class EstadisticasComponent implements OnInit {
  loading = false;
  exportando = false;

  totalVoluntarios = 0;
  totalEventos = 0;
  totalCheckIns = 0;
  totalDepartamentos = 0;

  diasRows: DiaRow[] = [];
  readonly diasColumns = ['fecha', 'cantidad'];

  barChartData: ChartData<'bar'> = { labels: [], datasets: [] };
  barChartOptions: ChartOptions<'bar'> = {
    responsive: true,
    plugins: { legend: { display: false }, title: { display: true, text: 'Check-Ins por Evento' } },
    scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
  };

  doughnutChartData: ChartData<'doughnut'> = { labels: [], datasets: [] };
  doughnutChartOptions: ChartOptions<'doughnut'> = {
    responsive: true,
    plugins: { legend: { position: 'right' }, title: { display: true, text: 'Voluntarios por Departamento' } }
  };

  lineChartData: ChartData<'line'> = { labels: [], datasets: [] };
  lineChartOptions: ChartOptions<'line'> = {
    responsive: true,
    plugins: { legend: { display: false }, title: { display: true, text: 'Check-Ins por Día (últimos 7 días)' } },
    scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
  };

  constructor(
    private estadisticasService: EstadisticasService,
    private checkInService: CheckInService,
  ) {}

  ngOnInit(): void {
    this.loading = true;
    this.estadisticasService.getResumen().subscribe({
      next: (resumen) => {
        this.totalVoluntarios   = resumen.totalVoluntarios;
        this.totalEventos       = resumen.totalEventos;
        this.totalCheckIns      = resumen.totalCheckIns;
        this.totalDepartamentos = resumen.totalDepartamentos;
        this.buildBarChart(resumen.checkInsPorEvento);
        this.buildDoughnutChart(resumen.voluntariosPorDepartamento);
        this.buildLineChart(resumen.checkInsPorDia);
        this.buildDiasTable(resumen.checkInsPorDia);
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  private buildBarChart(data: ItemConteoDTO[]): void {
    const labels = data.map(d => d.nombre);
    const values = data.map(d => d.cantidad);
    const colors = labels.map((_, i) => `hsl(${(i * 47) % 360}, 65%, 55%)`);
    this.barChartData = { labels, datasets: [{ data: values, backgroundColor: colors, borderRadius: 6 }] };
  }

  private buildDoughnutChart(data: ItemConteoDTO[]): void {
    const labels = data.map(d => d.nombre);
    const values = data.map(d => d.cantidad);
    const colors = labels.map((_, i) => `hsl(${(i * 67 + 20) % 360}, 60%, 55%)`);
    this.doughnutChartData = { labels, datasets: [{ data: values, backgroundColor: colors, hoverOffset: 8 }] };
  }

  private buildLineChart(data: ItemConteoDTO[]): void {
    const today = new Date();
    const days: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      days.push(d.toISOString().slice(0, 10));
    }
    const counts: Record<string, number> = Object.fromEntries(days.map(d => [d, 0]));
    data.forEach(d => { if (counts[d.nombre] !== undefined) counts[d.nombre] = d.cantidad; });
    this.lineChartData = {
      labels: days.map(d => d.slice(5)),
      datasets: [{
        data: days.map(d => counts[d]),
        borderColor: '#1976d2',
        backgroundColor: 'rgba(25,118,210,0.15)',
        fill: true,
        tension: 0.4,
        pointRadius: 5
      }]
    };
  }

  private buildDiasTable(data: ItemConteoDTO[]): void {
    this.diasRows = [...data]
      .sort((a, b) => b.nombre.localeCompare(a.nombre))
      .map(d => ({ fecha: d.nombre, cantidad: d.cantidad }));
  }

  exportarXls(): void {
    this.exportando = true;
    this.checkInService.getAll().subscribe({
      next: (checkIns) => this.generarExcel(checkIns),
      error: () => { this.exportando = false; }
    });
  }

  private generarExcel(checkIns: CheckInDTO[]): void {
    const wb = new Workbook();

    const wsSummary = wb.addWorksheet('Resumen por Día');
    wsSummary.columns = [
      { header: 'Fecha', key: 'fecha', width: 14 },
      { header: 'Check-Ins', key: 'cantidad', width: 12 },
    ];
    wsSummary.getRow(1).font = { bold: true };
    this.diasRows.forEach(r => wsSummary.addRow(r));

    const wsDetail = wb.addWorksheet('Detalle Check-Ins');
    wsDetail.columns = [
      { header: 'ID', key: 'id', width: 8 },
      { header: 'Fecha y Hora', key: 'fechaHora', width: 20 },
      { header: 'Voluntario', key: 'voluntarioNombre', width: 30 },
      { header: 'Evento', key: 'eventoNombre', width: 30 },
      { header: 'Observaciones', key: 'observaciones', width: 40 },
    ];
    wsDetail.getRow(1).font = { bold: true };
    checkIns.forEach(c => wsDetail.addRow({
      id: c.id,
      fechaHora: c.fechaHora,
      voluntarioNombre: c.voluntarioNombre,
      eventoNombre: c.eventoNombre,
      observaciones: c.observaciones ?? '',
    }));

    wb.xlsx.writeBuffer().then(buffer => {
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `estadisticas_${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      this.exportando = false;
    });
  }
}
