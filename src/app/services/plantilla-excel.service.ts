import { Injectable } from '@angular/core';
import * as ExcelJS from 'exceljs';
import JSZip from 'jszip';
import { EventoDTO } from '../models/evento.model';
import { VoluntarioDTO } from '../models/voluntario.model';
import { EventoVoluntarioDTO } from '../models/evento-voluntario.model';
import { DepartamentoDTO } from '../models/departamento.model';

// ── Colores ──────────────────────────────────────────────────────────────────
const COLOR_DEPT    = 'FF2E7D32'; // verde — departamento
const COLOR_VOL     = 'FFE65100'; // naranja — voluntario
const COLOR_ACCESO  = 'FF6A1B9A'; // morado — días de acceso
const COLOR_TEXT    = 'FFFFFFFF'; // blanco

@Injectable({ providedIn: 'root' })
export class PlantillaExcelService {

  async descargarPlantillaMaestra(): Promise<void> {
    const wb = new ExcelJS.Workbook();
    wb.creator = 'Asamblea Regional Backoffice';
    wb.created = new Date();
    const ws = wb.addWorksheet('Carga Maestra', {
      views: [{ state: 'frozen', ySplit: 1 }],
      pageSetup: { orientation: 'landscape', fitToPage: true }
    });

    const cols = [
      { header: 'departamento',  color: COLOR_DEPT,  width: 22 },
      { header: 'responsable',   color: COLOR_DEPT,  width: 12 },
      { header: 'auxiliar',      color: COLOR_DEPT,  width: 12 },
      { header: 'nombre',        color: COLOR_VOL,   width: 18 },
      { header: 'apellido1',     color: COLOR_VOL,   width: 16 },
      { header: 'apellido2',     color: COLOR_VOL,   width: 16 },
      { header: 'dni/nie',       color: COLOR_VOL,   width: 13 },
      { header: 'telefono',      color: COLOR_VOL,   width: 16 },
      { header: 'email',         color: COLOR_VOL,   width: 26 },
      { header: 'congregación',  color: COLOR_VOL,   width: 20 },
      { header: 'circuito',      color: COLOR_VOL,   width: 14 },
      { header: 'formación',     color: COLOR_VOL,   width: 12 },
    ];

    // ── Cabecera: fila 1 ────────────────────────────────────────────────────
    cols.forEach((col, idx) => {
      const cell = ws.getCell(1, idx + 1);
      cell.value = col.header;
      cell.font  = { bold: true, color: { argb: COLOR_TEXT }, size: 10 };
      cell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: col.color } };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = {
        bottom: { style: 'medium', color: { argb: 'FFFFFFFF' } },
        right:  { style: 'thin',   color: { argb: 'FFFFFFFF' } },
      };
      ws.getColumn(idx + 1).width = col.width;
    });
    ws.getRow(1).height = 30;

    // ── Data validation: columnas booleanas (Sí/No) ─────────────────────────
    const wsAny = ws as any;
    const siNoValidation = {
      type: 'list',
      allowBlank: true,
      formulae: ['"Sí,No"'],
      showInputMessage: true,
      promptTitle: 'Selecciona',
      prompt: 'Sí = verdadero, No = falso',
      showErrorMessage: true,
      errorStyle: 'warning',
      errorTitle: 'Valor inválido',
      error: 'Selecciona Sí o No',
    };
    // responsable (col 2), auxiliar (col 3), formación (col 12)
    [2, 3, 12].forEach(colIdx => {
      const letter = this.colLetter(colIdx);
      if (wsAny.dataValidations?.add) {
        wsAny.dataValidations.add(`${letter}2:${letter}5002`, siNoValidation);
      }
    });

    // ── Descargar ────────────────────────────────────────────────────────────
    const buffer = await wb.xlsx.writeBuffer();
    const blob   = new Blob([buffer],
      { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url  = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href     = url;
    link.download = 'plantilla_carga_masiva.xlsx';
    link.click();
    URL.revokeObjectURL(url);
  }

  // ── Plantilla por evento (nueva) ─────────────────────────────────────────

  async descargarPlantillaEvento(evento: EventoDTO): Promise<void> {
    const fechasEvento = this.calcularFechasEvento(evento);

    const wb = new ExcelJS.Workbook();
    wb.creator = 'Asamblea Regional Backoffice';
    wb.created = new Date();
    const ws = wb.addWorksheet('Carga Evento', {
      views: [{ state: 'frozen', ySplit: 1 }],
      pageSetup: { orientation: 'landscape', fitToPage: true }
    });

    // ── Columnas fijas ─────────────────────────────────────────────────────
    const fixedCols = [
      { header: 'departamento',  color: COLOR_DEPT,   width: 22 },
      { header: 'responsable',   color: COLOR_DEPT,   width: 12 },
      { header: 'auxiliar',      color: COLOR_DEPT,   width: 12 },
      { header: 'nombre',        color: COLOR_VOL,    width: 18 },
      { header: 'apellido1',     color: COLOR_VOL,    width: 16 },
      { header: 'apellido2',     color: COLOR_VOL,    width: 16 },
      { header: 'dni/nie',       color: COLOR_VOL,    width: 13 },
      { header: 'telefono',      color: COLOR_VOL,    width: 16 },
      { header: 'email',         color: COLOR_VOL,    width: 26 },
      { header: 'congregación',  color: COLOR_VOL,    width: 20 },
      { header: 'circuito',      color: COLOR_VOL,    width: 14 },
      { header: 'formación',     color: COLOR_VOL,    width: 12 },
    ];

    // ── Columnas de fecha (una por día del evento) ─────────────────────────
    const dateCols = fechasEvento.map(d => ({
      header: this.formatDateHeader(d),
      color: COLOR_ACCESO,
      width: 14,
    }));

    const allCols = [...fixedCols, ...dateCols];
    const totalCols = allCols.length;

    // ── Cabecera fila 1 ────────────────────────────────────────────────────
    allCols.forEach((col, idx) => {
      const cell = ws.getCell(1, idx + 1);
      cell.value = col.header;
      cell.font  = { bold: true, color: { argb: COLOR_TEXT }, size: 10 };
      cell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: col.color } };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = {
        bottom: { style: 'medium', color: { argb: 'FFFFFFFF' } },
        right:  { style: 'thin',   color: { argb: 'FFFFFFFF' } },
      };
      ws.getColumn(idx + 1).width = col.width;
    });
    ws.getRow(1).height = 30;

    // ── Data validation columnas booleanas (Sí/No) ────────────────────────
    const wsAny = ws as any;
    const siNoValidation = {
      type: 'list',
      allowBlank: true,
      formulae: ['"Sí,No"'],
      showInputMessage: true,
      promptTitle: 'Selecciona',
      prompt: 'Sí = verdadero, No = falso',
      showErrorMessage: true,
      errorStyle: 'warning',
      errorTitle: 'Valor inválido',
      error: 'Selecciona Sí o No',
    };
    // Fixed boolean columns: responsable (col 2), auxiliar (col 3), formación (col 12)
    const fixedBoolCols = [2, 3, 12];
    fixedBoolCols.forEach(colIdx => {
      const letter = this.colLetter(colIdx);
      if (wsAny.dataValidations?.add) {
        wsAny.dataValidations.add(`${letter}2:${letter}5002`, siNoValidation);
      }
    });
    // Date columns: one per event day, starting after fixed columns
    for (let i = fixedCols.length; i < totalCols; i++) {
      const colLetter = this.colLetter(i + 1);
      if (wsAny.dataValidations?.add) {
        wsAny.dataValidations.add(`${colLetter}2:${colLetter}5002`, siNoValidation);
      }
    }

    // ── Descargar ──────────────────────────────────────────────────────────
    const nombreArchivo = `plantilla_${evento.nombre?.replace(/\s+/g, '_') ?? 'evento'}.xlsx`;
    const buffer = await wb.xlsx.writeBuffer();
    const blob   = new Blob([buffer],
      { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url  = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href     = url;
    link.download = nombreArchivo;
    link.click();
    URL.revokeObjectURL(url);
  }

  async exportarVoluntarios(voluntarios: VoluntarioDTO[]): Promise<void> {
    const wb = new ExcelJS.Workbook();
    wb.creator = 'Asamblea Regional Backoffice';
    wb.created = new Date();
    const ws = wb.addWorksheet('Voluntarios', {
      views: [{ state: 'frozen', ySplit: 1 }],
      pageSetup: { orientation: 'landscape', fitToPage: true }
    });

    const cols = [
      { header: 'departamento',  color: COLOR_DEPT,  width: 22 },
      { header: 'responsable',   color: COLOR_DEPT,  width: 12 },
      { header: 'auxiliar',      color: COLOR_DEPT,  width: 12 },
      { header: 'nombre',        color: COLOR_VOL,   width: 18 },
      { header: 'apellido1',     color: COLOR_VOL,   width: 16 },
      { header: 'apellido2',     color: COLOR_VOL,   width: 16 },
      { header: 'dni/nie',       color: COLOR_VOL,   width: 13 },
      { header: 'telefono',      color: COLOR_VOL,   width: 16 },
      { header: 'email',         color: COLOR_VOL,   width: 26 },
      { header: 'congregación',  color: COLOR_VOL,   width: 20 },
      { header: 'circuito',      color: COLOR_VOL,   width: 14 },
      { header: 'formación',     color: COLOR_VOL,   width: 12 },
    ];

    // ── Cabecera: fila 1 ─────────────────────────────────────────────────────
    cols.forEach((col, idx) => {
      const cell = ws.getCell(1, idx + 1);
      cell.value = col.header;
      cell.font  = { bold: true, color: { argb: COLOR_TEXT }, size: 10 };
      cell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: col.color } };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = {
        bottom: { style: 'medium', color: { argb: 'FFFFFFFF' } },
        right:  { style: 'thin',   color: { argb: 'FFFFFFFF' } },
      };
      ws.getColumn(idx + 1).width = col.width;
    });
    ws.getRow(1).height = 30;

    // ── Filas 2+: datos de voluntarios ───────────────────────────────────────
    voluntarios.forEach((v, i) => {
      const row = ws.getRow(2 + i);
      const values = [
        (v.departamentoNombres ?? []).join(' | '),
        '',
        '',
        v.nombre ?? '',
        v.apellido1 ?? '',
        v.apellido2 ?? '',
        v.dni ?? '',
        v.telefono ?? '',
        v.email ?? '',
        v.congregacion ?? '',
        v.circuito ?? '',
        v.formacion ? 'Sí' : 'No',
      ];
      values.forEach((val, idx) => {
        const cell = row.getCell(idx + 1);
        cell.value = val;
        cell.font  = { size: 10 };
      });
    });

    // ── Descargar ─────────────────────────────────────────────────────────────
    const fecha  = new Date().toISOString().slice(0, 10);
    const buffer = await wb.xlsx.writeBuffer();
    const blob   = new Blob([buffer],
      { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url  = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href     = url;
    link.download = `voluntarios_${fecha}.xlsx`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async exportarAsignacionesEvento(
    asignaciones: EventoVoluntarioDTO[],
    voluntarios: VoluntarioDTO[],
    evento?: EventoDTO
  ): Promise<void> {
    const volMap = new Map(voluntarios.map(v => [v.id!, v]));
    const fechas = evento ? this.calcularFechasEvento(evento) : [];
    const conFechas = fechas.length > 0;

    const wb = new ExcelJS.Workbook();
    wb.creator = 'Asamblea Regional Backoffice';
    wb.created = new Date();
    const nombreHoja = evento ? evento.nombre?.slice(0, 31) ?? 'Evento' : 'Asignaciones';
    const ws = wb.addWorksheet(nombreHoja, {
      views: [{ state: 'frozen', ySplit: 1 }],
      pageSetup: { orientation: 'landscape', fitToPage: true }
    });

    const fixedCols: { header: string; color: string; width: number }[] = [
      { header: 'departamento', color: COLOR_DEPT, width: 22 },
      { header: 'responsable',  color: COLOR_DEPT, width: 12 },
      { header: 'auxiliar',     color: COLOR_DEPT, width: 12 },
      { header: 'nombre',       color: COLOR_VOL,  width: 18 },
      { header: 'apellido1',    color: COLOR_VOL,  width: 16 },
      { header: 'apellido2',    color: COLOR_VOL,  width: 16 },
      { header: 'dni/nie',      color: COLOR_VOL,  width: 13 },
      { header: 'telefono',     color: COLOR_VOL,  width: 16 },
      { header: 'email',        color: COLOR_VOL,  width: 26 },
      { header: 'congregación', color: COLOR_VOL,  width: 20 },
      { header: 'circuito',     color: COLOR_VOL,  width: 14 },
      { header: 'formación',    color: COLOR_VOL,  width: 12 },
    ];

    const dateCols = conFechas ? fechas.map(d => ({
      header: this.formatDateHeader(d),
      color: COLOR_ACCESO,
      width: 14,
      isoDate: d.toISOString().slice(0, 10),
    })) : [];

    if (!conFechas) {
      fixedCols.push({ header: 'evento', color: 'FF1565C0', width: 28 });
    }

    const allCols = [...fixedCols, ...dateCols];

    // ── Cabecera: fila 1 ─────────────────────────────────────────────────────
    allCols.forEach((col, idx) => {
      const cell = ws.getCell(1, idx + 1);
      cell.value = col.header;
      cell.font  = { bold: true, color: { argb: COLOR_TEXT }, size: 10 };
      cell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: col.color } };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = {
        bottom: { style: 'medium', color: { argb: 'FFFFFFFF' } },
        right:  { style: 'thin',   color: { argb: 'FFFFFFFF' } },
      };
      ws.getColumn(idx + 1).width = col.width;
    });
    ws.getRow(1).height = 30;

    // ── Filas 2+: datos ───────────────────────────────────────────────────────
    asignaciones.forEach((ev, i) => {
      const vol   = volMap.get(ev.voluntarioId);
      const acceso = ev.diasAcceso ? new Set(ev.diasAcceso.split('|')) : null;

      const fixedValues = [
        ev.voluntarioDepartamentoNombre ?? '',
        '',
        '',
        vol?.nombre    ?? '',
        vol?.apellido1 ?? '',
        vol?.apellido2 ?? '',
        vol?.dni       ?? '',
        vol?.telefono  ?? '',
        vol?.email     ?? '',
        vol?.congregacion ?? '',
        vol?.circuito  ?? '',
        vol?.formacion ? 'Sí' : 'No',
      ];

      const dateValues = dateCols.map(dc => acceso === null ? 'Sí' : acceso?.has(dc.isoDate) ? 'Sí' : 'No');
      const eventoCol  = !conFechas ? [ev.eventoNombre ?? ''] : [];
      const rowValues  = [...fixedValues, ...eventoCol, ...dateValues];

      const row = ws.getRow(2 + i);
      rowValues.forEach((val, idx) => {
        const cell = row.getCell(idx + 1);
        cell.value = val;
        cell.font  = { size: 10 };
      });
    });

    // ── Descargar ─────────────────────────────────────────────────────────────
    const fecha   = new Date().toISOString().slice(0, 10);
    const nombre  = evento ? evento.nombre?.replace(/\s+/g, '_') ?? 'evento' : 'asignaciones';
    const buffer  = await wb.xlsx.writeBuffer();
    const blob    = new Blob([buffer],
      { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url  = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href     = url;
    link.download = `${nombre}_${fecha}.xlsx`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async exportarDepartamentos(departamentos: DepartamentoDTO[], voluntarios: VoluntarioDTO[]): Promise<void> {
    const volByDni = new Map<string, VoluntarioDTO>();
    voluntarios.forEach(v => { if (v.dni) volByDni.set(v.dni.trim().toUpperCase(), v); });

    const getVolNombre = (v: VoluntarioDTO): string =>
      [v.nombre, v.apellido1, v.apellido2].filter(Boolean).join(' ');

    const resolveDisplay = (dni?: string): string => {
      if (!dni) return '';
      const found = volByDni.get(dni.trim().toUpperCase());
      return found ? getVolNombre(found) : dni;
    };

    const resolveAuxiliares = (aux?: string): string => {
      if (!aux) return '';
      return aux.split(',').map(v => resolveDisplay(v.trim())).filter(Boolean).join(', ');
    };

    const COLS = [
      { header: 'ID',           color: 'FF546E7A', width: 8  },
      { header: 'Apellido 1',   color: COLOR_VOL,  width: 18 },
      { header: 'Apellido 2',   color: COLOR_VOL,  width: 18 },
      { header: 'Nombre',       color: COLOR_VOL,  width: 20 },
      { header: 'DNI',          color: COLOR_VOL,  width: 14 },
      { header: 'Teléfono',     color: COLOR_VOL,  width: 16 },
      { header: 'Email',        color: COLOR_VOL,  width: 28 },
      { header: 'Congregación', color: COLOR_VOL,  width: 22 },
      { header: 'Circuito',     color: COLOR_VOL,  width: 14 },
      { header: 'Correo JW',    color: COLOR_VOL,  width: 26 },
      { header: 'Formación',    color: COLOR_ACCESO, width: 12 },
      { header: 'Pre-Asamblea', color: COLOR_ACCESO, width: 14 },
      { header: 'Activo',       color: COLOR_DEPT, width: 10 },
    ];

    const sortedDepts = [...departamentos].sort((a, b) => a.nombre.localeCompare(b.nombre));
    const fecha = new Date().toISOString().slice(0, 10);
    const zip = new JSZip();

    for (const dept of sortedDepts) {
      const deptWb = new ExcelJS.Workbook();
      deptWb.creator = 'Asamblea Regional Backoffice';
      deptWb.created = new Date();

      const ws = deptWb.addWorksheet(dept.nombre.slice(0, 31), {
        views: [{ state: 'frozen', ySplit: 4 }],
        pageSetup: { orientation: 'landscape', fitToPage: true },
      });

      COLS.forEach((col, idx) => { ws.getColumn(idx + 1).width = col.width; });

      ws.mergeCells(1, 1, 1, COLS.length);
      const titleCell = ws.getCell(1, 1);
      titleCell.value = `DEPARTAMENTO: ${dept.nombre.toUpperCase()}`;
      titleCell.font = { bold: true, size: 14, color: { argb: COLOR_TEXT } };
      titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_DEPT } };
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
      ws.getRow(1).height = 32;

      ws.mergeCells(2, 1, 2, COLS.length);
      const infoCell = ws.getCell(2, 1);
      infoCell.value = `Responsable: ${resolveDisplay(dept.responsable) || '—'}   |   Auxiliares: ${resolveAuxiliares(dept.auxiliares) || '—'}`;
      infoCell.font = { italic: true, size: 10, color: { argb: 'FF37474F' } };
      infoCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F5E9' } };
      infoCell.alignment = { horizontal: 'left', vertical: 'middle' };
      ws.getRow(2).height = 20;

      ws.getRow(3).height = 8;

      COLS.forEach((col, idx) => {
        const cell = ws.getCell(4, idx + 1);
        cell.value = col.header;
        cell.font  = { bold: true, color: { argb: COLOR_TEXT }, size: 10 };
        cell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: col.color } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = {
          bottom: { style: 'medium', color: { argb: 'FFFFFFFF' } },
          right:  { style: 'thin',   color: { argb: 'FFFFFFFF' } },
        };
      });
      ws.getRow(4).height = 26;

      const deptVols = voluntarios
        .filter(v => dept.id != null && (v.departamentoIds ?? []).includes(dept.id))
        .sort((a, b) => (a.apellido1 ?? '').localeCompare(b.apellido1 ?? ''));

      deptVols.forEach((v, i) => {
        const rowBg = i % 2 === 1 ? 'FFF9F9F9' : 'FFFFFFFF';
        const values: (string | number)[] = [
          v.id ?? '',
          v.apellido1 ?? '',
          v.apellido2 ?? '',
          v.nombre ?? '',
          v.dni ?? '',
          v.telefono ?? '',
          v.email ?? '',
          v.congregacion ?? '',
          v.circuito ?? '',
          v.correoJw ?? '',
          v.formacion ? 'Sí' : 'No',
          v.preAsamblea ? 'Sí' : 'No',
          v.activo !== false ? 'Sí' : 'No',
        ];
        values.forEach((val, idx) => {
          const cell = ws.getCell(5 + i, idx + 1);
          cell.value = val;
          cell.font  = { size: 10 };
          cell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } };
          cell.border = {
            bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
            right:  { style: 'thin', color: { argb: 'FFE0E0E0' } },
          };
        });
      });

      ws.autoFilter = `A4:${this.colLetter(COLS.length)}4`;

      const buffer = await deptWb.xlsx.writeBuffer();
      const fileName = `${dept.nombre.replace(/[/\\?%*:|"<>]/g, '_')}_${fecha}.xlsx`;
      zip.file(fileName, buffer);
    }

    const zipBuffer = await zip.generateAsync({ type: 'arraybuffer' });
    const blob = new Blob([zipBuffer], { type: 'application/zip' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `departamentos_${fecha}.zip`;
    link.click();
    URL.revokeObjectURL(url);
  }

  private calcularFechasEvento(evento: EventoDTO): Date[] {
    if (!evento.fechaInicioEvento || !evento.fechaFinEvento) return [];
    const inicio = new Date(evento.fechaInicioEvento);
    const fin    = new Date(evento.fechaFinEvento);
    inicio.setHours(0, 0, 0, 0);
    fin.setHours(0, 0, 0, 0);

    const diasPre = evento.diasPreEvento ?? 0;
    const desde = new Date(inicio);
    desde.setDate(desde.getDate() - diasPre);   // retroceder N días pre-evento

    const fechas: Date[] = [];
    const cur = new Date(desde);
    while (cur <= fin) {
      fechas.push(new Date(cur));
      cur.setDate(cur.getDate() + 1);
    }
    return fechas;
  }

  private formatDateHeader(d: Date): string {
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }

  private colLetter(n: number): string {
    let s = '';
    let num = n;
    while (num > 0) {
      num--;
      s = String.fromCharCode(65 + (num % 26)) + s;
      num = Math.floor(num / 26);
    }
    return s;
  }
}

