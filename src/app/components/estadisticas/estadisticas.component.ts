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
import { forkJoin } from 'rxjs';
import { CheckInService } from '@app/services/check-in.service';
import { EstadisticasService } from '@app/services/estadisticas.service';
import { EventoService } from '@app/services/evento.service';
import { EventoVoluntarioService } from '@app/services/evento-voluntario.service';
import { ItemConteoDTO, DepartamentoTrackingDTO } from '@app/models/estadisticas.model';
import { CheckInDTO } from '@app/models/check-in.model';
import { EventoDTO } from '@app/models/evento.model';
import { EventoVoluntarioDTO } from '@app/models/evento-voluntario.model';

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

  trackingRows: DepartamentoTrackingDTO[] = [];
  readonly trackingColumns = ['departamento', 'totalAsignados', 'conCheckIn', 'sinCheckIn', 'porcentaje'];

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
    private eventoVoluntarioService: EventoVoluntarioService,
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
        this.trackingRows = resumen.trackingPorDepartamento ?? [];
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
    const eventoId = this.eventoSeleccionadoId;

    const checkIns$ = eventoId != null
      ? this.checkInService.getByEvento(eventoId)
      : this.checkInService.getAll();

    if (eventoId != null) {
      forkJoin({
        checkIns: checkIns$,
        asignaciones: this.eventoVoluntarioService.getByEvento(eventoId, {}, false),
      }).subscribe({
        next: ({ checkIns, asignaciones }) => this.generarExcel(checkIns, asignaciones, eventoId),
        error: () => { this.exportando = false; },
      });
    } else {
      checkIns$.subscribe({
        next: (checkIns: CheckInDTO[]) => this.generarExcel(checkIns, [], null),
        error: () => { this.exportando = false; },
      });
    }
  }

  private generarExcel(checkIns: CheckInDTO[], asignaciones: EventoVoluntarioDTO[], eventoId: number | null): void {
    const wb = new Workbook();

    // ── Hoja 1: Resumen por Día ────────────────────────────────────────────
    const wsSummary = wb.addWorksheet('Resumen por Día');
    wsSummary.columns = [
      { header: 'Fecha', key: 'fecha', width: 14 },
      { header: 'Check-Ins', key: 'cantidad', width: 12 },
    ];
    wsSummary.getRow(1).font = { bold: true };
    this.diasRows.forEach(r => wsSummary.addRow(r));

    // ── Hoja 2: Detalle Check-Ins ─────────────────────────────────────────
    const wsDetail = wb.addWorksheet('Detalle Check-Ins');
    wsDetail.columns = [
      { header: 'ID', key: 'id', width: 8 },
      { header: 'Check-In', key: 'fechaCheckIn', width: 20 },
      { header: 'Check-Out', key: 'fechaCheckOut', width: 20 },
      { header: 'Estado', key: 'estado', width: 14 },
      { header: 'Voluntario', key: 'voluntarioNombre', width: 30 },
      { header: 'Evento', key: 'eventoNombre', width: 30 },
      { header: 'Observaciones', key: 'observaciones', width: 40 },
      { header: 'Realizado Por', key: 'realizadoPor', width: 20 },
    ];
    wsDetail.getRow(1).font = { bold: true };
    checkIns.forEach(c => wsDetail.addRow({
      id: c.id,
      fechaCheckIn: c.fechaCheckIn?.replace('T', ' ') ?? '',
      fechaCheckOut: c.fechaCheckOut?.replace('T', ' ') ?? '',
      estado: c.estado ?? '',
      voluntarioNombre: c.voluntarioNombre ?? '',
      eventoNombre: c.eventoNombre ?? '',
      observaciones: c.observaciones ?? '',
      realizadoPor: c.realizadoPor ?? '',
    }));

    // ── Hoja 3: Tracking por Departamento (solo si hay evento) ────────────
    if (eventoId != null && this.trackingRows.length > 0) {
      const wsTracking = wb.addWorksheet('Tracking Departamentos');
      wsTracking.columns = [
        { header: 'Departamento',  key: 'departamento',   width: 28 },
        { header: 'Asignados',     key: 'totalAsignados', width: 12 },
        { header: 'Con Check-In',  key: 'conCheckIn',     width: 14 },
        { header: 'Sin Check-In',  key: 'sinCheckIn',     width: 14 },
        { header: '% Completado',  key: 'porcentaje',     width: 14 },
      ];
      wsTracking.getRow(1).font = { bold: true };
      this.trackingRows.forEach(r => wsTracking.addRow({
        departamento:   r.departamento,
        totalAsignados: r.totalAsignados,
        conCheckIn:     r.conCheckIn,
        sinCheckIn:     r.sinCheckIn,
        porcentaje:     r.totalAsignados > 0
          ? `${Math.round((r.conCheckIn / r.totalAsignados) * 100)}%`
          : '0%',
      }));
    }

    // ── Hoja 4: Seguimiento por Día (solo si hay evento con asignaciones) ─
    if (eventoId != null && asignaciones.length > 0) {
      const evento = this.eventos.find(e => e.id === eventoId);
      const dias = this.calcularDiasEvento(evento);

      if (dias.length > 0) {
        // Mapa: eventoVoluntarioId → array de check-ins ese día
        const checkInPorEvVolYDia = new Map<string, CheckInDTO>();
        checkIns.forEach(c => {
          if (c.eventoVoluntarioId && c.fechaCheckIn) {
            const dia = c.fechaCheckIn.slice(0, 10);
            const clave = `${c.eventoVoluntarioId}_${dia}`;
            if (!checkInPorEvVolYDia.has(clave)) checkInPorEvVolYDia.set(clave, c);
          }
        });

        const wsDias = wb.addWorksheet('Seguimiento por Día');
        wsDias.columns = [
          { header: 'Fecha',         key: 'fecha',       width: 14 },
          { header: 'Voluntario',    key: 'voluntario',  width: 30 },
          { header: 'Departamento',  key: 'departamento',width: 26 },
          { header: 'Check-In',      key: 'checkin',     width: 10 },
          { header: 'Hora',          key: 'hora',        width: 10 },
          { header: 'Realizado Por', key: 'realizadoPor',width: 20 },
          { header: 'Observaciones', key: 'obs',         width: 36 },
        ];
        wsDias.getRow(1).font = { bold: true };

        dias.forEach(dia => {
          // Voluntarios con acceso ese día
          const asignadosEseDia = asignaciones.filter(ev => {
            if (!ev.diasAcceso) return true; // acceso total
            return ev.diasAcceso.split('|').map(d => d.trim()).includes(dia);
          });

          asignadosEseDia.forEach(ev => {
            const clave = `${ev.id}_${dia}`;
            const ci = checkInPorEvVolYDia.get(clave);
            wsDias.addRow({
              fecha:       dia,
              voluntario:  ev.voluntarioNombre ?? '',
              departamento: ev.voluntarioDepartamentoNombre ?? '',
              checkin:     ci ? 'Sí' : 'No',
              hora:        ci?.fechaCheckIn ? ci.fechaCheckIn.slice(11, 16) : '',
              realizadoPor: ci?.realizadoPor ?? '',
              obs:         ci?.observaciones ?? '',
            });
          });
        });
      }
    }

    const fileName = eventoId != null
      ? `seguimiento_${this.nombreEventoSeleccionado?.replace(/\s+/g, '_') ?? eventoId}_${new Date().toISOString().slice(0, 10)}.xlsx`
      : `estadisticas_${new Date().toISOString().slice(0, 10)}.xlsx`;

    wb.xlsx.writeBuffer().then(buffer => {
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
      this.exportando = false;
    });
  }

  private calcularDiasEvento(evento: EventoDTO | undefined): string[] {
    if (!evento?.fechaInicioEvento || !evento?.fechaFinEvento) return [];
    const diasPre = evento.diasPreEvento ?? 0;
    const inicio = new Date(evento.fechaInicioEvento);
    inicio.setDate(inicio.getDate() - diasPre);
    const fin = new Date(evento.fechaFinEvento);
    const dias: string[] = [];
    const cur = new Date(inicio);
    while (cur <= fin) {
      dias.push(cur.toISOString().slice(0, 10));
      cur.setDate(cur.getDate() + 1);
    }
    return dias;
  }

  pct(row: DepartamentoTrackingDTO): number {
    return row.totalAsignados > 0 ? Math.round((row.conCheckIn / row.totalAsignados) * 100) : 0;
  }
}
