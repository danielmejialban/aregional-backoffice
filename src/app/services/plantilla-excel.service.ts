import { Injectable } from '@angular/core';
import * as ExcelJS from 'exceljs';

// ── Colores ──────────────────────────────────────────────────────────────────
const COLOR_EVENTO  = 'FF1565C0'; // azul  — evento
const COLOR_DEPT    = 'FF2E7D32'; // verde — departamento
const COLOR_VOL     = 'FFE65100'; // naranja — voluntario
const COLOR_ACCESO  = 'FF6A1B9A'; // morado — días de acceso
const COLOR_TEXT    = 'FFFFFFFF'; // blanco

interface ColDef {
  header: string;
  key: string;
  width: number;
  color: string;
  tipo: 'texto' | 'fecha' | 'entero';
  nota?: string;
}

const COLUMNAS: ColDef[] = [
  // Evento
  { header: 'evento',           key: 'A', width: 28, color: COLOR_EVENTO,  tipo: 'texto',  nota: 'Nombre del evento (obligatorio)' },
  { header: 'fechaInicioEvento',key: 'B', width: 18, color: COLOR_EVENTO,  tipo: 'fecha',  nota: 'Fecha inicio (dd/mm/aaaa)' },
  { header: 'fechaFinEvento',   key: 'C', width: 18, color: COLOR_EVENTO,  tipo: 'fecha',  nota: 'Fecha fin (dd/mm/aaaa)' },
  { header: 'diasPreEvento',    key: 'D', width: 14, color: COLOR_EVENTO,  tipo: 'entero', nota: 'Días de acceso previo al evento (0 si ninguno)' },
  // Departamento
  { header: 'departamento',     key: 'E', width: 22, color: COLOR_DEPT,    tipo: 'texto',  nota: 'Nombre del departamento (obligatorio)' },
  { header: 'responsable',      key: 'F', width: 16, color: COLOR_DEPT,    tipo: 'texto',  nota: 'DNI/NIE del responsable del departamento' },
  { header: 'auxiliares',       key: 'G', width: 24, color: COLOR_DEPT,    tipo: 'texto',  nota: 'DNIs/NIEs de auxiliares separados por comas' },
  // Voluntario
  { header: 'nombre',           key: 'H', width: 18, color: COLOR_VOL,     tipo: 'texto',  nota: 'Máx. 25 caracteres (obligatorio)' },
  { header: 'apellido1',        key: 'I', width: 16, color: COLOR_VOL,     tipo: 'texto',  nota: 'Máx. 15 caracteres (obligatorio)' },
  { header: 'apellido2',        key: 'J', width: 16, color: COLOR_VOL,     tipo: 'texto',  nota: 'Máx. 15 caracteres (opcional)' },
  { header: 'dni',              key: 'K', width: 13, color: COLOR_VOL,     tipo: 'texto',  nota: 'DNI (8 dígitos + letra) o NIE (X/Y/Z + 7 dígitos + letra)' },
  { header: 'telefono',         key: 'L', width: 18, color: COLOR_VOL,     tipo: 'texto',  nota: 'Ej: +34 612 345 678 (opcional)' },
  { header: 'email',            key: 'M', width: 26, color: COLOR_VOL,     tipo: 'texto',  nota: 'Email (opcional)' },
  // Días de acceso
  { header: 'dia_acceso_1',     key: 'N', width: 15, color: COLOR_ACCESO,  tipo: 'fecha',  nota: 'Fecha específica de acceso 1 (opcional)' },
  { header: 'dia_acceso_2',     key: 'O', width: 15, color: COLOR_ACCESO,  tipo: 'fecha',  nota: 'Fecha específica de acceso 2 (opcional)' },
  { header: 'dia_acceso_3',     key: 'P', width: 15, color: COLOR_ACCESO,  tipo: 'fecha',  nota: 'Fecha específica de acceso 3 (opcional)' },
  { header: 'dia_acceso_4',     key: 'Q', width: 15, color: COLOR_ACCESO,  tipo: 'fecha',  nota: 'Fecha específica de acceso 4 (opcional)' },
  { header: 'dia_acceso_5',     key: 'R', width: 15, color: COLOR_ACCESO,  tipo: 'fecha',  nota: 'Fecha específica de acceso 5 (opcional)' },
  { header: 'dia_acceso_6',     key: 'S', width: 15, color: COLOR_ACCESO,  tipo: 'fecha',  nota: 'Fecha específica de acceso 6 (opcional)' },
  { header: 'dia_acceso_7',     key: 'T', width: 15, color: COLOR_ACCESO,  tipo: 'fecha',  nota: 'Fecha específica de acceso 7 (opcional)' },
];

@Injectable({ providedIn: 'root' })
export class PlantillaExcelService {

  async descargarPlantillaMaestra(): Promise<void> {
    const wb = new ExcelJS.Workbook();
    wb.creator  = 'Asamblea Regional Backoffice';
    wb.created  = new Date();
    const ws = wb.addWorksheet('Carga Maestra', {
      views: [{ state: 'frozen', ySplit: 2 }],   // congela las dos primeras filas (cabecera + leyenda)
      pageSetup: { orientation: 'landscape', fitToPage: true }
    });

    // ── Cabecera: fila 1 ────────────────────────────────────────────────────
    COLUMNAS.forEach((col, idx) => {
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

    // ── Fila 2: notas de ayuda ───────────────────────────────────────────────
    COLUMNAS.forEach((col, idx) => {
      const cell = ws.getCell(2, idx + 1);
      cell.value = col.nota ?? '';
      cell.font  = { italic: true, size: 8, color: { argb: 'FF546E7A' } };
      cell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } };
      cell.alignment = { wrapText: true, vertical: 'top' };
    });
    ws.getRow(2).height = 36;

    // ── Fila 3: ejemplo ─────────────────────────────────────────────────────
    const ejemplo: (string | number | Date | undefined)[] = [
      'Congreso 2026', new Date(2026, 8, 21), new Date(2026, 8, 23), 2,
      'Acomodación', '12345678A', '87654321B,23456789C',
      'Juan', 'García', 'López', '34567890D', '+34 612 345 678', 'juan@email.com',
      new Date(2026, 8, 21), new Date(2026, 8, 23), undefined, undefined, undefined, undefined, undefined,
    ];
    const filaEjemplo = ws.getRow(3);
    ejemplo.forEach((val, idx) => {
      const cell = filaEjemplo.getCell(idx + 1);
      cell.value = val ?? null;
      cell.font  = { size: 9, color: { argb: 'FF212121' } };
      cell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFCE4EC' } };
      if (val instanceof Date) cell.numFmt = 'dd/mm/yyyy';
    });

    // ── Data validation en columnas de fecha (B, C, N-T) ────────────────────
    // ExcelJS Worksheet es en realidad XSSFWorksheet que sí tiene dataValidations.
    // Usamos cast explícito para acceder a la API extendida.
    const wsAny = ws as any;
    const fechaCols = ['B', 'C', 'N', 'O', 'P', 'Q', 'R', 'S', 'T'];
    const fechaValidation = {
      type:             'date',
      allowBlank:       true,
      operator:         'greaterThan',
      formulae:         [new Date(2020, 0, 1)],
      showInputMessage: true,
      promptTitle:      'Fecha',
      prompt:           'Selecciona o escribe una fecha (dd/mm/aaaa)',
      showErrorMessage: true,
      errorStyle:       'warning',
      errorTitle:       'Fecha inválida',
      error:            'Introduce una fecha válida en formato dd/mm/aaaa',
    };
    fechaCols.forEach(col => {
      if (wsAny.dataValidations?.add) {
        wsAny.dataValidations.add(`${col}4:${col}5004`, fechaValidation);
      }
      ws.getColumn(col).numFmt = 'dd/mm/yyyy';
    });

    // Data validation columna D (diasPreEvento): entero 0-365
    if (wsAny.dataValidations?.add) {
      wsAny.dataValidations.add('D4:D5004', {
        type: 'whole', allowBlank: true, operator: 'between',
        formulae: [0, 365],
        showErrorMessage: true, errorStyle: 'warning',
        errorTitle: 'Valor inválido', error: 'Introduce un número entero entre 0 y 365',
      });
    }

    // ── Descargar ────────────────────────────────────────────────────────────
    const buffer = await wb.xlsx.writeBuffer();
    const blob   = new Blob([buffer],
      { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url  = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href     = url;
    link.download = 'plantilla_maestra_carga.xlsx';
    link.click();
    URL.revokeObjectURL(url);
  }
}

