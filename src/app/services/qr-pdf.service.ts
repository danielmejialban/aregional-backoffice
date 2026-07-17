import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
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

// ── Mapeo departamento → ruta PDF en /public/docs/ ──────────────────────────
// Clave: valor exacto de voluntarioDepartamentoNombre devuelto por el backend
const DEPT_TEMPLATES: Record<string, string> = {
  'Audio y Vídeo':                     '/docs/Audio y Vídeo.pdf',
  'Auxiliar del Coordinador del CAR':  '/docs/Auxiliar del Coordinador del CAR.pdf',
  'Información y Servicio Voluntario': '/docs/Información y Servicio Voluntario.pdf',
  'Instalación':                       '/docs/Instalación.pdf',
  'Local Broadcasting (LBD)':          '/docs/Local Broadcasting (LBD).pdf',
  'Transporte y Materiales':           '/docs/Transporte y Materiales.pdf',
};

// ── Posición del overlay sobre el template (puntos desde esquina inf-izq) ───
// El template es landscape: el rectángulo libre está aprox. en y=270-470, x=20-400
// QR a la izquierda del recuadro; nombre/dept/fecha a la derecha del QR
// AJUSTAR si tras prueba el contenido sigue desalineado
// Rectángulo libre del template (A4 landscape 842x595, origen inf-izq):
// x≈80-360 (borde izq. de la tarjeta ≈78), y≈302-410 (franja amarilla abajo, cabecera arriba)
// QR ocupa el lado izquierdo del recuadro; nombre/dept/fecha apilados a la derecha
const OV = {
  qrX:       86,   // dentro del borde izquierdo de la tarjeta
  qrY:       316,  // sobre la franja amarilla EPI (en "Instalación" llega hasta y≈313)
  qrSize:    90,   // qrTop = 316+90 = 406 → margen bajo la cabecera (y≈410)
  nameX:     194,  // a la derecha del QR (86+96+12)
  nameY:     390,  // parte alta del recuadro
  nameSize:  12,
  deptX:     194,
  deptY:     368,  // 22pt bajo nombre
  deptSize:  9,
  fechaX:    194,
  fechaY:    350,  // 18pt bajo dept
  fechaSize: 8,
};

@Injectable({ providedIn: 'root' })
export class QrPdfService {

  async generarPdf(
    asignaciones: EventoVoluntarioDTO[],
    voluntarios: VoluntarioDTO[],
    nombreFichero = 'pases.pdf'
  ): Promise<void> {
    const conQr = asignaciones.filter(a => !!a.qrImageBase64);
    if (!conQr.length) return;

    const conTemplate: EventoVoluntarioDTO[] = [];
    const sinTemplate: EventoVoluntarioDTO[] = [];

    for (const a of conQr) {
      const dept = a.voluntarioDepartamentoNombre ?? '';
      (DEPT_TEMPLATES[dept] ? conTemplate : sinTemplate).push(a);
    }

    const finalDoc = await PDFDocument.create();

    // 1. Pases con plantilla PDF de departamento
    for (const a of conTemplate) {
      const templateUrl = DEPT_TEMPLATES[a.voluntarioDepartamentoNombre!];
      const templateBytes = await fetch(templateUrl).then(r => r.arrayBuffer());
      const templateDoc = await PDFDocument.load(templateBytes);
      const [page] = await finalDoc.copyPages(templateDoc, [0]);
      finalDoc.addPage(page);
      await this.overlayPase(finalDoc, finalDoc.getPage(finalDoc.getPageCount() - 1), a, voluntarios);
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

    this.descargarBlob(await finalDoc.save(), nombreFichero);
  }

  // ── Overlay sobre una página de plantilla ────────────────────────────────
  private async overlayPase(
    pdfDoc: PDFDocument,
    page: ReturnType<PDFDocument['getPage']>,
    a: EventoVoluntarioDTO,
    voluntarios: VoluntarioDTO[]
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

    if (a.qrImageBase64) {
      const qrBytes = Uint8Array.from(atob(a.qrImageBase64), c => c.charCodeAt(0));
      const qrImage = await pdfDoc.embedPng(qrBytes);
      page.drawImage(qrImage, { x: OV.qrX, y: OV.qrY, width: OV.qrSize, height: OV.qrSize });
    }

    page.drawText(this.truncar(nombre, 35), {
      x: OV.nameX, y: OV.nameY, size: OV.nameSize, font: bold, color: dark,
    });

    page.drawText(this.truncar(dept, 42), {
      x: OV.deptX, y: OV.deptY, size: OV.deptSize, font: normal, color: muted,
    });

    page.drawText(fecha, {
      x: OV.fechaX, y: OV.fechaY, size: OV.fechaSize, font: normal, color: muted,
    });
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

    if (a.qrImageBase64) {
      doc.setFillColor('#F5F5F5');
      doc.setDrawColor(COLOR_BORDER);
      doc.setLineWidth(0.3);
      doc.roundedRect(QR_X - 1, QR_Y - 1, QR_SIZE + 2, QR_SIZE + 2, 1.5, 1.5, 'FD');
      doc.addImage(a.qrImageBase64, 'PNG', QR_X, QR_Y, QR_SIZE, QR_SIZE);
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  /** El pase incluye acceso a algún día pre-evento (anterior al inicio del evento). */
  private tieneAccesoPreEvento(a: EventoVoluntarioDTO): boolean {
    if (!a.diasAcceso || !a.fechaInicioEvento) return false;
    const inicio = a.fechaInicioEvento.slice(0, 10);
    return a.diasAcceso.split('|').some(d => d.trim() < inicio);
  }

  private descargarBlob(bytes: Uint8Array, nombreFichero: string): void {
    const blob = new Blob([bytes], { type: 'application/pdf' });
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
