import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import { EventoVoluntarioDTO } from '../models/evento-voluntario.model';

// ── Dimensiones en mm (unidad nativa de jsPDF con format 'a4') ──────────────
const PAGE_W      = 210;    // A4 ancho
const PAGE_H      = 297;    // A4 alto
const MARGIN_X    = 10;     // margen lateral
const MARGIN_Y    = 10;     // margen superior
const CARD_W      = 80;     // 8 cm
const CARD_H      = 50.1;   // 5.01 cm
const GAP_X       = 10;     // separación horizontal entre tarjetas
const GAP_Y       = 6;      // separación vertical entre tarjetas
const COLS        = 2;      // columnas por página
const ROWS        = 5;      // filas por página
const CARDS_PER_PAGE = COLS * ROWS;

// ── Colores ──────────────────────────────────────────────────────────────────
const COLOR_HEADER_BG  = '#1565C0';  // azul oscuro
const COLOR_HEADER_TXT = '#FFFFFF';
const COLOR_BODY_BG    = '#FFFFFF';
const COLOR_BORDER     = '#BBDEFB';  // azul claro
const COLOR_TEXT_DARK  = '#212121';
const COLOR_TEXT_MUTED = '#546E7A';

@Injectable({ providedIn: 'root' })
export class QrPdfService {

  /**
   * Genera y descarga un PDF con las tarjetas QR de las asignaciones recibidas.
   * @param asignaciones  Lista de asignaciones (deben tener qrImageBase64)
   * @param nombreFichero Nombre del archivo PDF descargado
   */
  generarPdf(asignaciones: EventoVoluntarioDTO[], nombreFichero = 'tarjetas_qr.pdf'): void {
    const conQr = asignaciones.filter(a => !!a.qrImageBase64);
    if (!conQr.length) return;

    const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });

    conQr.forEach((asignacion, index) => {
      const posEnPagina = index % CARDS_PER_PAGE;

      // Nueva página (excepto la primera)
      if (index > 0 && posEnPagina === 0) doc.addPage();

      const col = posEnPagina % COLS;
      const row = Math.floor(posEnPagina / COLS);
      const x   = MARGIN_X + col * (CARD_W + GAP_X);
      const y   = MARGIN_Y + row * (CARD_H + GAP_Y);

      this.dibujarTarjeta(doc, asignacion, x, y);
    });

    doc.save(nombreFichero);
  }

  // ── Dibuja una tarjeta completa en las coordenadas indicadas ───────────────
  private dibujarTarjeta(doc: jsPDF, a: EventoVoluntarioDTO, x: number, y: number): void {
    const HEADER_H = 10;
    const QR_SIZE  = 30;
    const QR_X     = x + CARD_W - QR_SIZE - 4;
    const QR_Y     = y + HEADER_H + 3;

    // ── Sombra suave (rectángulo desplazado) ───────────────────────────────
    doc.setFillColor('#E0E0E0');
    doc.roundedRect(x + 0.8, y + 0.8, CARD_W, CARD_H, 3, 3, 'F');

    // ── Fondo blanco de la tarjeta ─────────────────────────────────────────
    doc.setFillColor(COLOR_BODY_BG);
    doc.setDrawColor(COLOR_BORDER);
    doc.setLineWidth(0.4);
    doc.roundedRect(x, y, CARD_W, CARD_H, 3, 3, 'FD');

    // ── Cabecera azul ──────────────────────────────────────────────────────
    doc.setFillColor(COLOR_HEADER_BG);
    // Clip con roundedRect para que la cabecera respete el radio superior
    doc.roundedRect(x, y, CARD_W, HEADER_H, 3, 3, 'F');
    // Rectángulo sin redondear en la parte inferior para unir con el cuerpo
    doc.setFillColor(COLOR_HEADER_BG);
    doc.rect(x, y + 4, CARD_W, HEADER_H - 4, 'F');

    // ── Título del evento (cabecera) ───────────────────────────────────────
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(COLOR_HEADER_TXT);
    const titulo = this.truncar(a.eventoNombre ?? 'Evento', 42);
    doc.text(titulo, x + 4, y + 6.5);

    // ── Nombre del voluntario ──────────────────────────────────────────────
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(COLOR_TEXT_DARK);
    const nombre = this.truncar(a.voluntarioNombre ?? '', 28);
    const lineas = doc.splitTextToSize(nombre, CARD_W - QR_SIZE - 10);
    doc.text(lineas, x + 4, y + HEADER_H + 7);

    // ── Línea separadora fina ──────────────────────────────────────────────
    doc.setDrawColor('#E3F2FD');
    doc.setLineWidth(0.3);
    doc.line(x + 4, y + HEADER_H + 11, x + CARD_W - QR_SIZE - 6, y + HEADER_H + 11);

    // ── Fecha del evento ───────────────────────────────────────────────────
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(COLOR_TEXT_MUTED);
    const fecha = a.fechaInicioEvento ? this.formatearFecha(a.fechaInicioEvento) : '—';
    doc.text('📅 ' + fecha, x + 4, y + HEADER_H + 16);

    // ── Etiqueta "ACREDITACIÓN" ────────────────────────────────────────────
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6);
    doc.setTextColor('#90A4AE');
    doc.text('ACREDITACIÓN', x + 4, y + CARD_H - 5);

    // ── Imagen QR ─────────────────────────────────────────────────────────
    if (a.qrImageBase64) {
      // Marco del QR
      doc.setFillColor('#F5F5F5');
      doc.setDrawColor(COLOR_BORDER);
      doc.setLineWidth(0.3);
      doc.roundedRect(QR_X - 1, QR_Y - 1, QR_SIZE + 2, QR_SIZE + 2, 1.5, 1.5, 'FD');
      doc.addImage(a.qrImageBase64, 'PNG', QR_X, QR_Y, QR_SIZE, QR_SIZE);
    }
  }

  // ── Utilidades ─────────────────────────────────────────────────────────────
  private truncar(texto: string, maxChars: number): string {
    return texto.length > maxChars ? texto.substring(0, maxChars - 1) + '…' : texto;
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

