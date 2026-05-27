import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import { EventoVoluntarioDTO } from '../models/evento-voluntario.model';
import { VoluntarioDTO } from '../models/voluntario.model';

// ── Dimensiones en mm (A4 portrait) ─────────────────────────────────────────
const MARGIN_X    = 10;
const MARGIN_Y    = 10;
const CARD_W      = 80;
const CARD_H      = 50.1;
const GAP_X       = 10;
const GAP_Y       = 6;
const COLS        = 2;
const ROWS        = 5;
const CARDS_PER_PAGE = COLS * ROWS;

// ── Colores ──────────────────────────────────────────────────────────────────
const COLOR_HEADER_BG  = '#1565C0';
const COLOR_HEADER_TXT = '#FFFFFF';
const COLOR_BODY_BG    = '#FFFFFF';
const COLOR_BORDER     = '#BBDEFB';
const COLOR_TEXT_DARK  = '#212121';
const COLOR_TEXT_MUTED = '#546E7A';

@Injectable({ providedIn: 'root' })
export class QrPdfService {

  /**
   * Genera y descarga un PDF con los pases de acceso de las asignaciones recibidas.
   * Cada pase muestra: nombre del evento, nombre completo del voluntario, fecha y QR.
   */
  generarPdf(
    asignaciones: EventoVoluntarioDTO[],
    voluntarios: VoluntarioDTO[],
    nombreFichero = 'pases.pdf'
  ): void {
    const conQr = asignaciones.filter(a => !!a.qrImageBase64);
    if (!conQr.length) return;

    const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });

    conQr.forEach((asignacion, index) => {
      const posEnPagina = index % CARDS_PER_PAGE;
      if (index > 0 && posEnPagina === 0) doc.addPage();

      const col = posEnPagina % COLS;
      const row = Math.floor(posEnPagina / COLS);
      const x   = MARGIN_X + col * (CARD_W + GAP_X);
      const y   = MARGIN_Y + row * (CARD_H + GAP_Y);

      this.dibujarPase(doc, asignacion, voluntarios, x, y);
    });

    doc.save(nombreFichero);
  }

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

    // ── Sombra ────────────────────────────────────────────────────────────────
    doc.setFillColor('#E0E0E0');
    doc.roundedRect(x + 0.8, y + 0.8, CARD_W, CARD_H, 3, 3, 'F');

    // ── Fondo blanco + borde ──────────────────────────────────────────────────
    doc.setFillColor(COLOR_BODY_BG);
    doc.setDrawColor(COLOR_BORDER);
    doc.setLineWidth(0.4);
    doc.roundedRect(x, y, CARD_W, CARD_H, 3, 3, 'FD');

    // ── Cabecera azul ─────────────────────────────────────────────────────────
    doc.setFillColor(COLOR_HEADER_BG);
    doc.roundedRect(x, y, CARD_W, HEADER_H, 3, 3, 'F');
    doc.rect(x, y + 4, CARD_W, HEADER_H - 4, 'F');

    // ── Nombre del evento ─────────────────────────────────────────────────────
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(COLOR_HEADER_TXT);
    doc.text(this.truncar(a.eventoNombre ?? 'Evento', 42), x + 4, y + 6.5);

    // ── Nombre completo del voluntario ────────────────────────────────────────
    const vol = voluntarios.find(v => v.id === a.voluntarioId);
    const nombreCompleto = vol
      ? [vol.nombre, vol.apellido1, vol.apellido2].filter(Boolean).join(' ')
      : (a.voluntarioNombre ?? '-');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(COLOR_TEXT_DARK);
    const lineasNombre = doc.splitTextToSize(this.truncar(nombreCompleto, 36), TEXT_W);
    doc.text(lineasNombre.slice(0, 2), x + 4, y + HEADER_H + 8);

    // ── Fecha ─────────────────────────────────────────────────────────────────
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(COLOR_TEXT_MUTED);
    const fecha = a.fechaInicioEvento ? this.formatearFecha(a.fechaInicioEvento) : '-';
    doc.text(fecha, x + 4, y + HEADER_H + 22);

    // ── Imagen QR ─────────────────────────────────────────────────────────────
    if (a.qrImageBase64) {
      doc.setFillColor('#F5F5F5');
      doc.setDrawColor(COLOR_BORDER);
      doc.setLineWidth(0.3);
      doc.roundedRect(QR_X - 1, QR_Y - 1, QR_SIZE + 2, QR_SIZE + 2, 1.5, 1.5, 'FD');
      doc.addImage(a.qrImageBase64, 'PNG', QR_X, QR_Y, QR_SIZE, QR_SIZE);
    }
  }

  private truncar(texto: string, maxChars: number): string {
    return texto.length > maxChars ? texto.substring(0, maxChars - 1) + '...' : texto;
  }

  private formatearFecha(fecha: string): string {
    try {
      const d = new Date(fecha + 'T00:00:00');
      return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });
    } catch {
      return fecha;
    }
  }
}
