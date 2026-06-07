import { Injectable } from '@angular/core';
import * as ExcelJS from 'exceljs';
import { EventoDTO } from '../models/evento.model';

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
      views: [{ state: 'frozen', ySplit: 2 }],
      pageSetup: { orientation: 'landscape', fitToPage: true }
    });

    const cols = [
      { header: 'departamento',  color: COLOR_DEPT,  width: 22, nota: 'Nombre del departamento (obligatorio)' },
      { header: 'responsable',   color: COLOR_DEPT,  width: 12, nota: 'Sí si es el responsable del departamento' },
      { header: 'auxiliar',      color: COLOR_DEPT,  width: 12, nota: 'Sí si es auxiliar del departamento' },
      { header: 'nombre',        color: COLOR_VOL,   width: 18, nota: 'Máx. 25 caracteres (obligatorio)' },
      { header: 'apellido1',     color: COLOR_VOL,   width: 16, nota: 'Máx. 15 caracteres (obligatorio)' },
      { header: 'apellido2',     color: COLOR_VOL,   width: 16, nota: 'Máx. 15 caracteres (opcional)' },
      { header: 'dni/nie',       color: COLOR_VOL,   width: 13, nota: 'DNI (8 dígitos+letra) o NIE (X/Y/Z+7+letra)' },
      { header: 'telefono',      color: COLOR_VOL,   width: 16, nota: 'Opcional' },
      { header: 'email',         color: COLOR_VOL,   width: 26, nota: 'Opcional' },
      { header: 'congregación',  color: COLOR_VOL,   width: 20, nota: 'Opcional' },
      { header: 'circuito',      color: COLOR_VOL,   width: 14, nota: 'Opcional' },
      { header: 'formación',     color: COLOR_VOL,   width: 12, nota: 'Sí si ha completado formación' },
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

    // ── Fila 2: notas de ayuda ──────────────────────────────────────────────
    cols.forEach((col, idx) => {
      const cell = ws.getCell(2, idx + 1);
      cell.value = col.nota;
      cell.font  = { italic: true, size: 8, color: { argb: 'FF546E7A' } };
      cell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } };
      cell.alignment = { wrapText: true, vertical: 'top' };
    });
    ws.getRow(2).height = 36;

    // ── Fila 3: ejemplo ─────────────────────────────────────────────────────
    const exampleRow = [
      'Acomodación', 'Sí', 'No',
      'Juan', 'García', 'López', '34567890D',
      '+34 612 345 678', 'juan@email.com',
      'Congregación Sur', 'Circuito 12', 'No',
    ];
    const filaEjemplo = ws.getRow(3);
    exampleRow.forEach((val, idx) => {
      const cell = filaEjemplo.getCell(idx + 1);
      cell.value = val;
      cell.font  = { size: 9, color: { argb: 'FF212121' } };
      cell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFCE4EC' } };
    });

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
        wsAny.dataValidations.add(`${letter}4:${letter}5004`, siNoValidation);
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
      views: [{ state: 'frozen', ySplit: 2 }],
      pageSetup: { orientation: 'landscape', fitToPage: true }
    });

    // ── Columnas fijas ─────────────────────────────────────────────────────
    const fixedCols = [
      { header: 'departamento',  color: COLOR_DEPT,   width: 22, nota: 'Nombre del departamento (obligatorio)' },
      { header: 'responsable',   color: COLOR_DEPT,   width: 12, nota: 'Sí si es el responsable del departamento' },
      { header: 'auxiliar',      color: COLOR_DEPT,   width: 12, nota: 'Sí si es auxiliar del departamento' },
      { header: 'nombre',        color: COLOR_VOL,    width: 18, nota: 'Máx. 25 caracteres (obligatorio)' },
      { header: 'apellido1',     color: COLOR_VOL,    width: 16, nota: 'Máx. 15 caracteres (obligatorio)' },
      { header: 'apellido2',     color: COLOR_VOL,    width: 16, nota: 'Máx. 15 caracteres (opcional)' },
      { header: 'dni/nie',       color: COLOR_VOL,    width: 13, nota: 'DNI (8 dígitos+letra) o NIE (X/Y/Z+7+letra)' },
      { header: 'telefono',      color: COLOR_VOL,    width: 16, nota: 'Opcional' },
      { header: 'email',         color: COLOR_VOL,    width: 26, nota: 'Opcional' },
      { header: 'congregación',  color: COLOR_VOL,    width: 20, nota: 'Opcional' },
      { header: 'circuito',      color: COLOR_VOL,    width: 14, nota: 'Opcional' },
      { header: 'formación',     color: COLOR_VOL,    width: 12, nota: 'Sí si ha completado formación' },
    ];

    // ── Columnas de fecha (una por día del evento) ─────────────────────────
    const dateCols = fechasEvento.map(d => ({
      header: this.formatDateHeader(d),
      color: COLOR_ACCESO,
      width: 14,
      nota: 'Sí = acceso permitido ese día, No = sin acceso',
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

    // ── Fila 2: notas ──────────────────────────────────────────────────────
    allCols.forEach((col, idx) => {
      const cell = ws.getCell(2, idx + 1);
      cell.value = col.nota;
      cell.font  = { italic: true, size: 8, color: { argb: 'FF546E7A' } };
      cell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } };
      cell.alignment = { wrapText: true, vertical: 'top' };
    });
    ws.getRow(2).height = 36;

    // ── Fila 3: ejemplo ───────────────────────────────────────────────────
    const exampleFixed = [
      'Acomodación', 'Sí', 'No',
      'Juan', 'García', 'López', '34567890D',
      '+34 612 345 678', 'juan@email.com',
      'Congregación Sur', 'Circuito 12', 'No',
    ];
    const exampleDates = fechasEvento.map(() => 'Sí');
    const exampleRow = [...exampleFixed, ...exampleDates];
    const filaEjemplo = ws.getRow(3);
    exampleRow.forEach((val, idx) => {
      const cell = filaEjemplo.getCell(idx + 1);
      cell.value = val;
      cell.font  = { size: 9, color: { argb: 'FF212121' } };
      cell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFCE4EC' } };
    });

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
        wsAny.dataValidations.add(`${letter}4:${letter}5004`, siNoValidation);
      }
    });
    // Date columns: one per event day, starting after fixed columns
    for (let i = fixedCols.length; i < totalCols; i++) {
      const colLetter = this.colLetter(i + 1);
      if (wsAny.dataValidations?.add) {
        wsAny.dataValidations.add(`${colLetter}4:${colLetter}5004`, siNoValidation);
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

