import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslateModule } from '@ngx-translate/core';
import { BaseChartDirective } from 'ng2-charts';
import { ChartData, ChartOptions } from 'chart.js';
import { Workbook } from 'exceljs';
import { CheckInService } from '@app/services/check-in.service';
import { EstadisticasService } from '@app/services/estadisticas.service';
import { EventoService } from '@app/services/evento.service';
import { ItemConteoDTO } from '@app/models/estadisticas.model';
import { CheckInDTO } from '@app/models/check-in.model';
import { EventoDTO } from '@app/models/evento.model';

export interface DiaRow {
  fecha: string;
  cantidad: number;
}

/** Paleta consistente y accesible para todos los charts */
const PALETTE = [
  '#1565C0', '#2E7D32', '#E65100', '#6A1B9A', '#C62828',
  '#00838F', '#F9A825', '#4527A0', '#AD1457', '#37474F',
  '#0277BD', '#558B2F', '#EF6C00', '#7B1FA2', '#D32F2F',
];

const color = (i: number) => PALETTE[i % PALETTE.length];

@Component({
  selector: 'app-estadisticas',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatTableModule,
    MatFormFieldModule,
    MatSelectModule,
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

  eventos: EventoDTO[] = [];
  eventoSeleccionadoId: number | null = null;

  totalVoluntarios = 0;
  totalEventos = 0;
  totalCheckIns = 0;
  totalDepartamentos = 0;

  diasRows: DiaRow[] = [];
  readonly diasColumns = ['fecha', 'cantidad'];

  hayCheckInsEvento = false;
  hayCheckInsDepartamento = false;
  hayVoluntariosDepartamento = false;
  hayCheckInsDia = false;

  // ── Check-ins por evento (barras verticales) ────────────────────────────
  barChartData: ChartData<'bar'> = { labels: [], datasets: [] };
  barChartOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: ctx => ` ${ctx.parsed.y} check-ins` } }
    },
    scales: {
      x: { grid: { display: false } },
      y: { beginAtZero: true, ticks: { stepSize: 1, precision: 0 }, grid: { color: 'rgba(0,0,0,0.06)' } }
    }
  };

  // ── Check-ins por departamento (barras horizontales) ────────────────────
  deptBarChartData: ChartData<'bar'> = { labels: [], datasets: [] };
  deptBarChartOptions: ChartOptions<'bar'> = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: ctx => ` ${ctx.parsed.x} check-ins` } }
    },
    scales: {
      x: { beginAtZero: true, ticks: { stepSize: 1, precision: 0 }, grid: { color: 'rgba(0,0,0,0.06)' } },
      y: { grid: { display: false } }
    }
  };

  // ── Voluntarios por departamento (doughnut) ─────────────────────────────
  doughnutChartData: ChartData<'doughnut'> = { labels: [], datasets: [] };
  doughnutChartOptions: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '62%',
    plugins: {
      legend: { position: 'right', labels: { boxWidth: 14, padding: 10 } },
      tooltip: {
        callbacks: {
          label: ctx => {
            const total = (ctx.dataset.data as number[]).reduce((a, b) => a + b, 0);
            const pct = total ? Math.round((ctx.parsed / total) * 100) : 0;
            return ` ${ctx.label}: ${ctx.parsed} (${pct}%)`;
          }
        }
      }
    }
  };

  // ── Check-ins por día (línea, últimos 14 días) ──────────────────────────
  lineChartData: ChartData<'line'> = { labels: [], datasets: [] };
  lineChartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: ctx => ` ${ctx.parsed.y} check-ins` } }
    },
    scales: {
      x: { grid: { display: false } },
      y: { beginAtZero: true, ticks: { stepSize: 1, precision: 0 }, grid: { color: 'rgba(0,0,0,0.06)' } }
    }
  };

  constructor(
    private estadisticasService: EstadisticasService,
    private checkInService: CheckInService,
    private eventoService: EventoService,
  ) {}

  ngOnInit(): void {
    this.eventoService.getAll().subscribe({
      next: (eventos) => this.eventos = eventos,
      error: () => {}
    });
    this.cargarResumen();
  }

  cargarResumen(): void {
    this.loading = true;
    this.estadisticasService.getResumen(this.eventoSeleccionadoId).subscribe({
      next: (resumen) => {
        this.totalVoluntarios   = resumen.totalVoluntarios;
        this.totalEventos       = resumen.totalEventos;
        this.totalCheckIns      = resumen.totalCheckIns;
        this.totalDepartamentos = resumen.totalDepartamentos;
        this.buildBarChart(resumen.checkInsPorEvento);
        this.buildDeptBarChart(resumen.checkInsPorDepartamento ?? []);
        this.buildDoughnutChart(resumen.voluntariosPorDepartamento);
        this.buildLineChart(resumen.checkInsPorDia);
        this.buildDiasTable(resumen.checkInsPorDia);
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  onEventoChange(): void {
    this.cargarResumen();
  }

  get nombreEventoSeleccionado(): string | null {
    if (this.eventoSeleccionadoId == null) return null;
    return this.eventos.find(e => e.id === this.eventoSeleccionadoId)?.nombre ?? null;
  }

  private buildBarChart(data: ItemConteoDTO[]): void {
    this.hayCheckInsEvento = data.length > 0;
    this.barChartData = {
      labels: data.map(d => d.nombre),
      datasets: [{
        data: data.map(d => d.cantidad),
        backgroundColor: data.map((_, i) => color(i)),
        borderRadius: 6,
        maxBarThickness: 48,
      }]
    };
  }

  private buildDeptBarChart(data: ItemConteoDTO[]): void {
    this.hayCheckInsDepartamento = data.length > 0;
    this.deptBarChartData = {
      labels: data.map(d => d.nombre),
      datasets: [{
        data: data.map(d => d.cantidad),
        backgroundColor: data.map((_, i) => color(i)),
        borderRadius: 6,
        maxBarThickness: 26,
      }]
    };
  }

  private buildDoughnutChart(data: ItemConteoDTO[]): void {
    this.hayVoluntariosDepartamento = data.length > 0;
    this.doughnutChartData = {
      labels: data.map(d => d.nombre),
      datasets: [{
        data: data.map(d => d.cantidad),
        backgroundColor: data.map((_, i) => color(i)),
        hoverOffset: 8,
        borderWidth: 2,
        borderColor: '#fff',
      }]
    };
  }

  private buildLineChart(data: ItemConteoDTO[]): void {
    this.hayCheckInsDia = data.length > 0;
    const today = new Date();
    const days: string[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      days.push(d.toISOString().slice(0, 10));
    }
    const counts: Record<string, number> = Object.fromEntries(days.map(d => [d, 0]));
    data.forEach(d => { if (counts[d.nombre] !== undefined) counts[d.nombre] = d.cantidad; });
    this.lineChartData = {
      labels: days.map(d => {
        const [, m, day] = d.split('-');
        return `${day}/${m}`;
      }),
      datasets: [{
        data: days.map(d => counts[d]),
        borderColor: '#1565C0',
        backgroundColor: 'rgba(21,101,192,0.12)',
        fill: true,
        tension: 0.35,
        pointRadius: 4,
        pointBackgroundColor: '#1565C0',
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
    const checkIns$ = this.eventoSeleccionadoId != null
      ? this.checkInService.getByEvento(this.eventoSeleccionadoId)
      : this.checkInService.getAll();
    checkIns$.subscribe({
      next: (checkIns: CheckInDTO[]) => this.generarExcel(checkIns),
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
      { header: 'Check-In', key: 'fechaCheckIn', width: 20 },
      { header: 'Check-Out', key: 'fechaCheckOut', width: 20 },
      { header: 'Estado', key: 'estado', width: 14 },
      { header: 'Voluntario', key: 'voluntarioNombre', width: 30 },
      { header: 'Evento', key: 'eventoNombre', width: 30 },
      { header: 'Observaciones', key: 'observaciones', width: 40 },
    ];
    wsDetail.getRow(1).font = { bold: true };
    checkIns.forEach(c => wsDetail.addRow({
      id: c.id,
      fechaCheckIn: c.fechaCheckIn?.replace('T', ' ') ?? '',
      fechaCheckOut: c.fechaCheckOut?.replace('T', ' ') ?? '',
      estado: c.estado ?? '',
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
