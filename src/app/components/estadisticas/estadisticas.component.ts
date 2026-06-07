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
import { forkJoin } from 'rxjs';
import { Workbook } from 'exceljs';
import { CheckInService } from '@app/services/check-in.service';
import { VoluntarioService } from '@app/services/voluntario.service';
import { EventoService } from '@app/services/evento.service';
import { DepartamentoService } from '@app/services/departamento.service';
import { CheckInDTO } from '@app/models/check-in.model';
import { VoluntarioDTO } from '@app/models/voluntario.model';
import { EventoDTO } from '@app/models/evento.model';
import { DepartamentoDTO } from '@app/models/departamento.model';

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

  private allCheckIns: CheckInDTO[] = [];

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
    private checkInService: CheckInService,
    private voluntarioService: VoluntarioService,
    private eventoService: EventoService,
    private departamentoService: DepartamentoService
  ) {}

  ngOnInit(): void {
    this.loading = true;
    forkJoin({
      checkIns: this.checkInService.getAll(),
      voluntarios: this.voluntarioService.getAll(),
      eventos: this.eventoService.getAll(),
      departamentos: this.departamentoService.getAll()
    }).subscribe({
      next: ({ checkIns, voluntarios, eventos, departamentos }) => {
        this.allCheckIns = checkIns;
        this.totalCheckIns = checkIns.length;
        this.totalVoluntarios = voluntarios.length;
        this.totalEventos = eventos.length;
        this.totalDepartamentos = departamentos.length;
        this.buildBarChart(checkIns, eventos);
        this.buildDoughnutChart(voluntarios, departamentos);
        this.buildLineChart(checkIns);
        this.buildDiasTable(checkIns);
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  private buildBarChart(checkIns: CheckInDTO[], eventos: EventoDTO[]): void {
    const counts: Record<string, number> = {};
    checkIns.forEach(c => {
      const name = c.eventoNombre || `Evento ${c.eventoId}`;
      counts[name] = (counts[name] || 0) + 1;
    });
    const labels = Object.keys(counts);
    const data = labels.map(l => counts[l]);
    const colors = labels.map((_, i) => `hsl(${(i * 47) % 360}, 65%, 55%)`);
    this.barChartData = { labels, datasets: [{ data, backgroundColor: colors, borderRadius: 6 }] };
  }

  private buildDoughnutChart(voluntarios: VoluntarioDTO[], departamentos: DepartamentoDTO[]): void {
    const counts: Record<string, number> = {};
    departamentos.forEach(d => { counts[d.nombre] = 0; });
    voluntarios.forEach(v => {
      const dep = v.departamentoNombre || `Dep. ${v.departamentoId}`;
      counts[dep] = (counts[dep] || 0) + 1;
    });
    const labels = Object.keys(counts).filter(k => counts[k] > 0);
    const data = labels.map(l => counts[l]);
    const colors = labels.map((_, i) => `hsl(${(i * 67 + 20) % 360}, 60%, 55%)`);
    this.doughnutChartData = { labels, datasets: [{ data, backgroundColor: colors, hoverOffset: 8 }] };
  }

  private buildLineChart(checkIns: CheckInDTO[]): void {
    const days: string[] = [];
    const counts: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      days.push(key);
      counts[key] = 0;
    }
    checkIns.forEach(c => {
      if (c.fechaHora) {
        const key = c.fechaHora.slice(0, 10);
        if (counts[key] !== undefined) counts[key]++;
      }
    });
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

  private buildDiasTable(checkIns: CheckInDTO[]): void {
    const counts: Record<string, number> = {};
    checkIns.forEach(c => {
      if (c.fechaHora) {
        const key = c.fechaHora.slice(0, 10);
        counts[key] = (counts[key] || 0) + 1;
      }
    });
    this.diasRows = Object.entries(counts)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([fecha, cantidad]) => ({ fecha, cantidad }));
  }

  exportarXls(): void {
    this.exportando = true;
    const wb = new Workbook();

    // Sheet 1: daily summary
    const wsSummary = wb.addWorksheet('Resumen por Día');
    wsSummary.columns = [
      { header: 'Fecha', key: 'fecha', width: 14 },
      { header: 'Check-Ins', key: 'cantidad', width: 12 },
    ];
    wsSummary.getRow(1).font = { bold: true };
    this.diasRows.forEach(r => wsSummary.addRow(r));

    // Sheet 2: detailed check-ins
    const wsDetail = wb.addWorksheet('Detalle Check-Ins');
    wsDetail.columns = [
      { header: 'ID', key: 'id', width: 8 },
      { header: 'Fecha y Hora', key: 'fechaHora', width: 20 },
      { header: 'Voluntario', key: 'voluntarioNombre', width: 30 },
      { header: 'Evento', key: 'eventoNombre', width: 30 },
      { header: 'Observaciones', key: 'observaciones', width: 40 },
    ];
    wsDetail.getRow(1).font = { bold: true };
    this.allCheckIns.forEach(c => wsDetail.addRow({
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
