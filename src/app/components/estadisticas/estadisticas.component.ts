import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslateModule } from '@ngx-translate/core';
import { BaseChartDirective } from 'ng2-charts';
import { ChartData, ChartOptions } from 'chart.js';
import { forkJoin } from 'rxjs';
import { CheckInService } from '@app/services/check-in.service';
import { VoluntarioService } from '@app/services/voluntario.service';
import { EventoService } from '@app/services/evento.service';
import { DepartamentoService } from '@app/services/departamento.service';
import { CheckInDTO } from '@app/models/check-in.model';
import { VoluntarioDTO } from '@app/models/voluntario.model';
import { EventoDTO } from '@app/models/evento.model';
import { DepartamentoDTO } from '@app/models/departamento.model';

@Component({
  selector: 'app-estadisticas',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule, MatProgressSpinnerModule, TranslateModule, BaseChartDirective],
  templateUrl: './estadisticas.component.html',
  styleUrls: ['./estadisticas.component.scss']
})
export class EstadisticasComponent implements OnInit {
  loading = true;

  // Summary counts
  totalVoluntarios = 0;
  totalEventos = 0;
  totalCheckIns = 0;
  totalDepartamentos = 0;

  // Bar chart: check-ins per event
  barChartData: ChartData<'bar'> = { labels: [], datasets: [] };
  barChartOptions: ChartOptions<'bar'> = {
    responsive: true,
    plugins: { legend: { display: false }, title: { display: true, text: 'Check-Ins por Evento' } },
    scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
  };

  // Doughnut chart: volunteers per department
  doughnutChartData: ChartData<'doughnut'> = { labels: [], datasets: [] };
  doughnutChartOptions: ChartOptions<'doughnut'> = {
    responsive: true,
    plugins: { legend: { position: 'right' }, title: { display: true, text: 'Voluntarios por Departamento' } }
  };

  // Line chart: check-ins over time (last 7 days)
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
    forkJoin({
      checkIns: this.checkInService.getAll(),
      voluntarios: this.voluntarioService.getAll(),
      eventos: this.eventoService.getAll(),
      departamentos: this.departamentoService.getAll()
    }).subscribe({
      next: ({ checkIns, voluntarios, eventos, departamentos }) => {
        this.totalCheckIns = checkIns.length;
        this.totalVoluntarios = voluntarios.length;
        this.totalEventos = eventos.length;
        this.totalDepartamentos = departamentos.length;
        this.buildBarChart(checkIns, eventos);
        this.buildDoughnutChart(voluntarios, departamentos);
        this.buildLineChart(checkIns);
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
    this.barChartData = {
      labels,
      datasets: [{ data, backgroundColor: colors, borderRadius: 6 }]
    };
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
    this.doughnutChartData = {
      labels,
      datasets: [{ data, backgroundColor: colors, hoverOffset: 8 }]
    };
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
}

