import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import JSZip from 'jszip';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { EventoVoluntarioDTO } from '../models/evento-voluntario.model';
import { VoluntarioDTO } from '../models/voluntario.model';

// ── Dimensiones layout estándar (A4 portrait, mm) ───────────────────────────
const MARGIN_X       = 10;
const MARGIN_Y       = 10;
const CARD_W         = 80;
const CARD_H         = 50.1;
const GAP_X          = 10;
const GAP_Y          = 6;
const COLS           = 2;
const CARDS_PER_PAGE = COLS * 5;

// ── Colores layout estándar ──────────────────────────────────────────────────
const COLOR_HEADER_BG        = '#1565C0';
const COLOR_HEADER_BG_ORANGE = '#E65100';
const COLOR_HEADER_TXT       = '#FFFFFF';
const COLOR_BODY_BG          = '#FFFFFF';
const COLOR_BORDER           = '#BBDEFB';
const COLOR_TEXT_DARK        = '#212121';
const COLOR_TEXT_MUTED       = '#546E7A';

// ── Templates PDF de departamento ────────────────────────────────────────────
// Página: 481.89 × 311.81 pt (170 × 110 mm), diseñada para doblar en 4.
// El QR placeholder está en el panel portada (cuadrante inferior-derecho en pantalla,
// inferior-derecho en contenido del PDF).
// CTM del PDF: scale 0.75 + y-flip → [0.75 0 0 -0.75 0 311.811]
// Placeholder en coords content: x=570.598 y=234.063 size=45.354
// En coords pdf-lib: x=570.598×0.75=427.948, y=311.811−(234.063+45.354)×0.75=102.248, size=34.016
interface TemplateConfig { url: string; }

const DEPT_TEMPLATES: Record<string, TemplateConfig> = {
  'Audio y Vídeo':                     { url: '/docs/Audio y Vídeo.pdf'                     },
  'Auxiliar del Coordinador del CAR':  { url: '/docs/Auxiliar del Coordinador del CAR.pdf'  },
  'CAR':                               { url: '/docs/Auxiliar del Coordinador del CAR.pdf'  },
  'Negociador de Contratos':           { url: '/docs/Auxiliar del Coordinador del CAR.pdf'  },
  'Información y Servicio Voluntario': { url: '/docs/Información y Servicio Voluntario.pdf' },
  'Instalación':                       { url: '/docs/Instalación.pdf'                       },
  'Local Broadcasting (LBD)':          { url: '/docs/Local Broadcasting (LBD).pdf'          },
  'Transporte y Materiales':           { url: '/docs/Transporte y Materiales.pdf'           },
};

const LBD_TRABAJO_ALTURA_CONFIG: TemplateConfig = {
  url: '/docs/LBD Trabajo en altura.pdf',
};

// Pase genérico: usado para cualquier departamento sin template específico
// cuando el voluntario tiene acceso a días de pre-evento.
const GENERICO_CONFIG: TemplateConfig = { url: '/docs/Generico.pdf' };

// ── Posición del QR en el placeholder (idéntica en todos los templates) ──────
// Placeholder medido: content-stream x=570.598, y=234.063, size=45.354
// En pdf-lib: x=427.948, y=102.248, size=34.016
// QR ampliado (size=60) anclado al mismo borde superior del placeholder
// (top original = 136.264; nuevo top = 77 + 60 = 137 → cubre el marco azul completo).
// El quiet-zone blanco del PNG de ZXing tapa el marco azul del template.
const QR_BOX = { x: 416, y: 77, size: 60 };

// ── Texto de overlay junto al QR (en la portada del desplegable) ─────────────
// La portada ocupa x=240.975–481.95, y=0–155.886 en pdf-lib.
// El QR ocupa x=416–476, y=77–137 (columna derecha de la portada).
// El texto va en la columna izquierda (x≈244–412) bajo el título del departamento.
// padding-left  = 1rem = 12pt  → x base 244 + 12 = 256
// padding-top   = 2rem = 24pt  → nombre 24pt por debajo del borde inferior del título (≈y 93) → nameY 69
const OV = {
  nameX: 256,  nameY: 69,  nameSize: 11,
  deptX: 256,  deptY: 54,  deptSize: 9,
  fechaX: 256, fechaY: 42, fechaSize: 8,
  diasX: 256,  diasY: 31,  diasSize: 7,
};

// GENERICO: misma columna izquierda, pero padding-top = 1rem = 12pt (título más bajo)
const OV_GENERICO = {
  nameX: 256,  nameY: 81,  nameSize: 11,
  deptX: 256,  deptY: 66,  deptSize: 9,
  fechaX: 256, fechaY: 54, fechaSize: 8,
  diasX: 256,  diasY: 43,  diasSize: 7,
};

// Overlay de título para template Genérico: cubre "Generico" y pone el nombre real del dept.
// Posición medida en el content-stream del PDF: Tm x=340.267 y=279.272, size=20.666pt
// → pdf-lib (CTM [0.75,0,0,-0.75,0,311.811]): x≈255, y≈102, size-efectivo≈15.5pt
const GENERICO_TITLE_RECT = { x: 241, y: 95, w: 175, h: 26 };
const GENERICO_TITLE_POS  = { x: 248, y: 102, size: 14 };

@Injectable({ providedIn: 'root' })
export class QrPdfService {

  async generarPdf(
    asignaciones: EventoVoluntarioDTO[],
    voluntarios: VoluntarioDTO[],
    nombreFichero = 'pases.pdf'
  ): Promise<void> {
    const bytes = await this.buildPdfBytes(asignaciones, voluntarios);
    if (bytes) this.descargarBlob(bytes, nombreFichero);
  }

  /**
   * Genera un ZIP con un PDF individual por cada voluntario que tenga QR.
   * El nombre de cada archivo es "{apellido1}_{nombre}_{evento}.pdf" (sin caracteres especiales).
   */
  async generarZipPorVoluntario(
    asignaciones: EventoVoluntarioDTO[],
    voluntarios: VoluntarioDTO[],
    nombreZip = 'pases_individuales.zip'
  ): Promise<void> {
    const conQr = asignaciones.filter(a => !!a.qrImageBase64);
    if (!conQr.length) return;

    const zip = new JSZip();

    for (const a of conQr) {
      const bytes = await this.buildPdfBytes([a], voluntarios);
      if (!bytes) continue;

      const vol = voluntarios.find(v => v.id === a.voluntarioId);
      const apellido = vol?.apellido1 ?? 'voluntario';
      const nombre   = vol?.nombre    ?? String(a.voluntarioId);
      const evento   = a.eventoNombre ?? 'evento';
      const nombreArchivo = this.sanitizarNombreArchivo(`${apellido}_${nombre}_${evento}.pdf`);
      zip.file(nombreArchivo, bytes);
    }

    const zipBytes = await zip.generateAsync({ type: 'uint8array' });
    this.descargarBlobConMime(zipBytes, nombreZip, 'application/zip');
  }

  /** Construye el PDF en memoria y devuelve los bytes, sin descargarlo. */
  private async buildPdfBytes(
    asignaciones: EventoVoluntarioDTO[],
    voluntarios: VoluntarioDTO[]
  ): Promise<Uint8Array | null> {
    const conQr = asignaciones.filter(a => !!a.qrImageBase64);
    if (!conQr.length) return null;

    const conTemplate: EventoVoluntarioDTO[] = [];
    const sinTemplate: EventoVoluntarioDTO[] = [];

    for (const a of conQr) {
      (this.getTemplateConfig(a, voluntarios) ? conTemplate : sinTemplate).push(a);
    }

    const finalDoc = await PDFDocument.create();

    // 1. Pases con plantilla PDF de departamento
    for (const a of conTemplate) {
      const config = this.getTemplateConfig(a, voluntarios)!;
      const templateBytes = await fetch(config.url).then(r => r.arrayBuffer());
      const templateDoc = await PDFDocument.load(templateBytes);
      const [page] = await finalDoc.copyPages(templateDoc, [0]);
      finalDoc.addPage(page);
      const isGenerico = config.url === GENERICO_CONFIG.url;
      await this.overlayPase(
        finalDoc,
        finalDoc.getPage(finalDoc.getPageCount() - 1),
        a,
        voluntarios,
        isGenerico ? OV_GENERICO : OV,
        isGenerico,
      );
    }

    // 2. Pases sin plantilla → layout estándar (jsPDF fusionado en el mismo PDF)
    if (sinTemplate.length > 0) {
      const jspdfDoc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
      sinTemplate.forEach((a, index) => {
        const posEnPagina = index % CARDS_PER_PAGE;
        if (index > 0 && posEnPagina === 0) jspdfDoc.addPage();
        const col = posEnPagina % COLS;
        const row = Math.floor(posEnPagina / COLS);
        const x = MARGIN_X + col * (CARD_W + GAP_X);
        const y = MARGIN_Y + row * (CARD_H + GAP_Y);
        this.dibujarPase(jspdfDoc, a, voluntarios, x, y);
      });

      const stdBytes = jspdfDoc.output('arraybuffer');
      const stdDoc = await PDFDocument.load(stdBytes);
      const indices = Array.from({ length: stdDoc.getPageCount() }, (_, i) => i);
      const copied = await finalDoc.copyPages(stdDoc, indices);
      copied.forEach(p => finalDoc.addPage(p));
    }

    return finalDoc.save();
  }

  /**
   * Config de template para el pase según departamento.
   * Comprueba primero el departamento de la asignación del evento y luego
   * TODOS los departamentos del voluntario, por si tiene más de uno y alguno
   * de ellos tiene template especial (p.ej. "Instalación | Acomodadores").
   * En LBD, los voluntarios con specialFunctionalities usan la variante "Trabajo en altura".
   * Fallback: si ningún departamento tiene template pero el voluntario tiene días
   * de pre-evento, se usa Generico.pdf.
   */
  private getTemplateConfig(a: EventoVoluntarioDTO, voluntarios: VoluntarioDTO[]): TemplateConfig | undefined {
    const vol = voluntarios.find(v => v.id === a.voluntarioId);

    // Candidatos: departamento del evento primero, luego el resto de departamentos del voluntario
    const candidatos: string[] = [];
    if (a.voluntarioDepartamentoNombre) candidatos.push(a.voluntarioDepartamentoNombre);
    for (const d of vol?.departamentoNombres ?? []) {
      if (!candidatos.includes(d)) candidatos.push(d);
    }

    for (const dept of candidatos) {
      const config = DEPT_TEMPLATES[dept];
      if (!config) continue;
      if (dept.toUpperCase().includes('LBD') && vol?.specialFunctionalities) {
        return LBD_TRABAJO_ALTURA_CONFIG;
      }
      return config;
    }

    return GENERICO_CONFIG;
  }

  // ── Overlay sobre una página de plantilla ────────────────────────────────
  // La plantilla ya incorpora su CTM (scale 0.75 + y-flip). El overlay se dibuja
  // en coordenadas absolutas de la página pdf-lib sin ningún translateContent.
  private async overlayPase(
    pdfDoc: PDFDocument,
    page: ReturnType<PDFDocument['getPage']>,
    a: EventoVoluntarioDTO,
    voluntarios: VoluntarioDTO[],
    ov = OV,
    esGenerico = false,
  ): Promise<void> {
    const vol = voluntarios.find(v => v.id === a.voluntarioId);
    const nombre = vol
      ? [vol.nombre, vol.apellido1, vol.apellido2].filter(Boolean).join(' ')
      : (a.voluntarioNombre ?? '-');
    const dept  = a.voluntarioDepartamentoNombre ?? '-';
    const fecha = a.fechaInicioEvento ? this.formatearFecha(a.fechaInicioEvento) : '-';

    const bold   = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const normal = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const dark   = rgb(0.13, 0.13, 0.13);
    const muted  = rgb(0.33, 0.43, 0.48);

    // Template Genérico: cubrir "Generico" con un rect blanco y dibujar el nombre real del dept
    if (esGenerico && dept !== '-') {
      page.drawRectangle({
        x: GENERICO_TITLE_RECT.x, y: GENERICO_TITLE_RECT.y,
        width: GENERICO_TITLE_RECT.w, height: GENERICO_TITLE_RECT.h,
        color: rgb(1, 1, 1),
      });
      page.drawText(this.truncar(dept, 26), {
        x: GENERICO_TITLE_POS.x, y: GENERICO_TITLE_POS.y,
        size: GENERICO_TITLE_POS.size, font: bold, color: rgb(0.08, 0.40, 0.75),
      });
    }

    // QR más grande sobre el placeholder; el quiet-zone blanco del PNG tapa el marco azul
    if (a.qrImageBase64) {
      const qrBytes = Uint8Array.from(atob(a.qrImageBase64), c => c.charCodeAt(0));
      const qrImage = await pdfDoc.embedPng(qrBytes);
      page.drawImage(qrImage, {
        x: QR_BOX.x, y: QR_BOX.y, width: QR_BOX.size, height: QR_BOX.size,
      });
    }

    // Nombre, departamento y fecha en la columna izquierda de la portada
    page.drawText(this.truncar(nombre, 24), {
      x: ov.nameX, y: ov.nameY, size: ov.nameSize, font: bold, color: dark,
    });

    page.drawText(this.truncar(dept, 30), {
      x: ov.deptX, y: ov.deptY, size: ov.deptSize, font: normal, color: muted,
    });

    page.drawText(fecha, {
      x: ov.fechaX, y: ov.fechaY, size: ov.fechaSize, font: normal, color: muted,
    });

    // Días de acceso (máx. 2 líneas)
    const lineasDias = this.lineasDiasAcceso(a, 36);
    lineasDias.forEach((linea, i) => {
      page.drawText(linea, {
        x: ov.diasX, y: ov.diasY - i * 11, size: ov.diasSize, font: normal, color: muted,
      });
    });

    // Matrícula (solo si existe)
    if (a.matricula?.trim()) {
      page.drawText(`Matr.: ${a.matricula.trim()}`, {
        x: ov.diasX,
        y: ov.diasY - lineasDias.length * 11,
        size: ov.diasSize,
        font: bold,
        color: dark,
      });
    }
  }

  // ── Tarjeta estándar (jsPDF) ─────────────────────────────────────────────
  private dibujarPase(
    doc: jsPDF,
    a: EventoVoluntarioDTO,
    voluntarios: VoluntarioDTO[],
    x: number,
    y: number
  ): void {
    const HEADER_H = 10;
    const QR_SIZE  = 30;
    const QR_X     = x + CARD_W - QR_SIZE - 4;
    const QR_Y     = y + HEADER_H + 3;
    const TEXT_W   = CARD_W - QR_SIZE - 12;

    doc.setFillColor('#E0E0E0');
    doc.roundedRect(x + 0.8, y + 0.8, CARD_W, CARD_H, 3, 3, 'F');

    doc.setFillColor(COLOR_BODY_BG);
    doc.setDrawColor(COLOR_BORDER);
    doc.setLineWidth(0.4);
    doc.roundedRect(x, y, CARD_W, CARD_H, 3, 3, 'FD');

    const vol = voluntarios.find(v => v.id === a.voluntarioId);
    const headerColor = this.tieneAccesoPreEvento(a) ? COLOR_HEADER_BG_ORANGE : COLOR_HEADER_BG;
    doc.setFillColor(headerColor);
    doc.roundedRect(x, y, CARD_W, HEADER_H, 3, 3, 'F');
    doc.rect(x, y + 4, CARD_W, HEADER_H - 4, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(COLOR_HEADER_TXT);
    doc.text(this.truncar(a.eventoNombre ?? 'Evento', 42), x + 4, y + 6.5);

    const nombreCompleto = vol
      ? [vol.nombre, vol.apellido1, vol.apellido2].filter(Boolean).join(' ')
      : (a.voluntarioNombre ?? '-');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(COLOR_TEXT_DARK);
    const lineasNombre = doc.splitTextToSize(this.truncar(nombreCompleto, 36), TEXT_W);
    doc.text(lineasNombre.slice(0, 2), x + 4, y + HEADER_H + 8);

    const deptNombre = a.voluntarioDepartamentoNombre ?? (vol?.departamentoNombres ?? []).join(' | ');
    if (deptNombre) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(COLOR_TEXT_MUTED);
      doc.text(this.truncar(deptNombre, 30), x + 4, y + HEADER_H + 16);
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(COLOR_TEXT_MUTED);
    const fecha = a.fechaInicioEvento ? this.formatearFecha(a.fechaInicioEvento) : '-';
    doc.text(fecha, x + 4, y + HEADER_H + 22);

    doc.setFontSize(5.8);
    const lineasDias = this.lineasDiasAcceso(a, 42);
    lineasDias.forEach((linea, i) => {
      doc.text(linea, x + 4, y + HEADER_H + 27 + i * 3.2);
    });

    if (a.matricula?.trim()) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6);
      doc.setTextColor(COLOR_TEXT_DARK);
      doc.text(`Matrícula: ${a.matricula.trim()}`, x + 4, y + HEADER_H + 27 + lineasDias.length * 3.2);
    }

    if (a.qrImageBase64) {
      doc.setFillColor('#F5F5F5');
      doc.setDrawColor(COLOR_BORDER);
      doc.setLineWidth(0.3);
      doc.roundedRect(QR_X - 1, QR_Y - 1, QR_SIZE + 2, QR_SIZE + 2, 1.5, 1.5, 'FD');
      doc.addImage(a.qrImageBase64, 'PNG', QR_X, QR_Y, QR_SIZE, QR_SIZE);
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private lineasDiasAcceso(a: EventoVoluntarioDTO, maxChars: number): string[] {
    if (!a.diasAcceso?.trim()) {
      return ['Acceso: todos los días del evento'];
    }
    const dias = a.diasAcceso.split('|')
      .map(d => d.trim())
      .filter(Boolean)
      .sort()
      .map(d => {
        const [, m, dd] = d.split('-');
        return `${dd}/${m}`;
      });

    const palabras = ('Acceso: ' + dias.join(' · ')).split(' ');
    const lineas: string[] = [];
    let actual = '';
    for (const p of palabras) {
      if ((actual + ' ' + p).trim().length > maxChars) {
        lineas.push(actual.trim());
        actual = p;
      } else {
        actual = (actual + ' ' + p).trim();
      }
    }
    if (actual) lineas.push(actual);

    if (lineas.length > 2) {
      return [lineas[0], this.truncar(lineas[1] + ' ' + lineas.slice(2).join(' '), maxChars)];
    }
    return lineas;
  }

  private tieneAccesoPreEvento(a: EventoVoluntarioDTO): boolean {
    if (!a.diasAcceso || !a.fechaInicioEvento) return false;
    const inicio = a.fechaInicioEvento.slice(0, 10);
    return a.diasAcceso.split('|').some(d => d.trim() < inicio);
  }

  private sanitizarNombreArchivo(nombre: string): string {
    return nombre
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-zA-Z0-9._\-]/g, '_')
      .replace(/_+/g, '_');
  }

  private descargarBlob(bytes: Uint8Array, nombreFichero: string): void {
    this.descargarBlobConMime(bytes, nombreFichero, 'application/pdf');
  }

  private descargarBlobConMime(bytes: Uint8Array, nombreFichero: string, mimeType: string): void {
    const blob = new Blob([bytes], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = nombreFichero;
    link.click();
    URL.revokeObjectURL(url);
  }

  private truncar(texto: string, maxChars: number): string {
    return texto.length > maxChars ? texto.substring(0, maxChars - 1) + '…' : texto;
  }

  private formatearFecha(fecha: string): string {
    try {
      return new Date(fecha + 'T00:00:00').toLocaleDateString('es-ES', {
        day: '2-digit', month: 'long', year: 'numeric',
      });
    } catch {
      return fecha;
    }
  }
}
