/**
 * Generador de Manuales de Usuario por Rol
 * Ejecutar desde la raíz del proyecto backoffice:
 *   node scripts/generar-manuales.mjs
 */

import { createRequire } from 'module';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(__dirname, '..', 'public', 'docs', 'manuals');
if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

// ── Constantes de layout ───────────────────────────────────────────────────
const PAGE_W = 595.28;
const PAGE_H = 841.89;
const ML = 50, MR = 50, MT = 50, MB = 60;
const W = PAGE_W - ML - MR;

const C = {
  primary:   rgb(0.08, 0.39, 0.75),
  accent:    rgb(0.90, 0.32, 0.00),
  green:     rgb(0.18, 0.49, 0.20),
  text:      rgb(0.13, 0.13, 0.13),
  muted:     rgb(0.40, 0.40, 0.40),
  white:     rgb(1, 1, 1),
  lightBlue: rgb(0.88, 0.93, 0.98),
  lightGray: rgb(0.95, 0.95, 0.95),
  dark:      rgb(0.05, 0.10, 0.20),
  admin:     rgb(0.55, 0.00, 0.55),
  coord:     rgb(0.00, 0.40, 0.20),
  vol:       rgb(0.08, 0.39, 0.75),
  checkin:   rgb(0.60, 0.30, 0.00),
};

// ── Clase de renderizado ───────────────────────────────────────────────────
class PdfWriter {
  constructor(doc, bold, normal, italic, pageColor) {
    this.doc    = doc;
    this.bold   = bold;
    this.normal = normal;
    this.italic = italic;
    this.pageColor = pageColor;
    this.page   = null;
    this.y      = 0;
    this.pageNum = 0;
    this.addPage();
  }

  addPage() {
    this.page = this.doc.addPage([PAGE_W, PAGE_H]);
    this.pageNum++;
    this.y = PAGE_H - MT;
    // Decoración lateral
    this.page.drawRectangle({ x: 0, y: 0, width: 8, height: PAGE_H, color: this.pageColor });
    // Número de página
    this.page.drawText(`Pag. ${this.pageNum}`, {
      x: PAGE_W - MR, y: MB / 2, size: 8, font: this.normal, color: C.muted,
    });
  }

  ensureSpace(needed) {
    if (this.y - needed < MB) this.addPage();
  }

  // Mide el ancho de un texto
  textWidth(text, font, size) {
    return font.widthOfTextAtSize(text, size);
  }

  // Parte un texto en líneas que caben en maxW
  wrapText(text, font, size, maxW) {
    const words = text.split(' ');
    const lines = [];
    let current = '';
    for (const word of words) {
      const candidate = current ? current + ' ' + word : word;
      if (this.textWidth(candidate, font, size) > maxW) {
        if (current) lines.push(current);
        current = word;
      } else {
        current = candidate;
      }
    }
    if (current) lines.push(current);
    return lines;
  }

  // Escribe un bloque de texto con wrap automático
  text(content, { font, size = 10, color = C.text, indent = 0, spacing = 4 } = {}) {
    font = font || this.normal;
    const lines = this.wrapText(content, font, size, W - indent);
    for (const line of lines) {
      this.ensureSpace(size + spacing);
      this.page.drawText(line, { x: ML + indent, y: this.y - size, size, font, color });
      this.y -= size + spacing;
    }
  }

  // Título de sección con fondo de color
  sectionHeader(title, color = this.pageColor) {
    this.ensureSpace(30);
    this.y -= 8;
    this.page.drawRectangle({ x: ML - 4, y: this.y - 20, width: W + 8, height: 22, color });
    this.page.drawText(title.toUpperCase(), {
      x: ML + 4, y: this.y - 14, size: 10.5, font: this.bold, color: C.white,
    });
    this.y -= 28;
  }

  // Sub-sección
  subHeader(title) {
    this.ensureSpace(22);
    this.y -= 4;
    this.page.drawText(title, { x: ML, y: this.y - 12, size: 11, font: this.bold, color: C.dark });
    // Línea bajo el subtítulo
    this.page.drawLine({ start: { x: ML, y: this.y - 14 }, end: { x: ML + W, y: this.y - 14 }, thickness: 0.5, color: C.muted });
    this.y -= 22;
  }

  // Bullet point
  bullet(content, { font, size = 10, indent = 12 } = {}) {
    font = font || this.normal;
    const maxW = W - indent - 10;
    const lines = this.wrapText(content, font, size, maxW);
    for (let i = 0; i < lines.length; i++) {
      this.ensureSpace(size + 3);
      if (i === 0) {
        this.page.drawText('•', { x: ML + indent, y: this.y - size, size, font: this.bold, color: this.pageColor });
        this.page.drawText(lines[i], { x: ML + indent + 10, y: this.y - size, size, font, color: C.text });
      } else {
        this.page.drawText(lines[i], { x: ML + indent + 10, y: this.y - size, size, font, color: C.text });
      }
      this.y -= size + 3;
    }
  }

  // Cuadro de nota / aviso
  note(content, { color = C.lightBlue, borderColor, textColor = C.primary } = {}) {
    borderColor = borderColor || textColor;
    const font = this.italic;
    const size = 9.5;
    const lines = this.wrapText(content, font, size, W - 24);
    const h = lines.length * (size + 3) + 12;
    this.ensureSpace(h + 10);
    this.y -= 6;
    this.page.drawRectangle({ x: ML, y: this.y - h, width: W, height: h, color });
    this.page.drawLine({ start: { x: ML, y: this.y }, end: { x: ML, y: this.y - h }, thickness: 3, color: borderColor });
    let ly = this.y - 8;
    for (const line of lines) {
      this.page.drawText(line, { x: ML + 12, y: ly - size, size, font, color: textColor });
      ly -= size + 3;
    }
    this.y -= h + 8;
  }

  // Espacio vertical
  gap(px = 10) { this.y -= px; }

  // Tabla sencilla de 2 columnas
  table2(rows, { col1W = 160 } = {}) {
    const col2W = W - col1W;
    for (const [c1, c2] of rows) {
      const lines1 = this.wrapText(c1, this.bold,   9.5, col1W - 8);
      const lines2 = this.wrapText(c2, this.normal, 9.5, col2W - 8);
      const h = Math.max(lines1.length, lines2.length) * 13 + 6;
      this.ensureSpace(h);
      this.page.drawRectangle({ x: ML, y: this.y - h, width: col1W, height: h, color: C.lightGray });
      this.page.drawRectangle({ x: ML + col1W, y: this.y - h, width: col2W, height: h, color: C.white });
      this.page.drawLine({ start: { x: ML, y: this.y - h }, end: { x: ML + W, y: this.y - h }, thickness: 0.4, color: C.muted });
      let ly1 = this.y - 9;
      for (const l of lines1) {
        this.page.drawText(l, { x: ML + 4, y: ly1, size: 9.5, font: this.bold, color: C.dark });
        ly1 -= 13;
      }
      let ly2 = this.y - 9;
      for (const l of lines2) {
        this.page.drawText(l, { x: ML + col1W + 6, y: ly2, size: 9.5, font: this.normal, color: C.text });
        ly2 -= 13;
      }
      this.y -= h;
    }
  }
}

// ── Portada ────────────────────────────────────────────────────────────────
function drawCover(page, bold, normal, italic, roleLabel, roleColor, subtitle, fecha) {
  // Fondo superior
  page.drawRectangle({ x: 0, y: PAGE_H - 220, width: PAGE_W, height: 220, color: roleColor });
  // Banda lateral
  page.drawRectangle({ x: 0, y: 0, width: 8, height: PAGE_H, color: roleColor });

  // Logotipo / nombre sistema
  page.drawText('Asamblea Regional', { x: ML, y: PAGE_H - 60, size: 22, font: bold, color: C.white });
  page.drawText('Sistema de Gestion de Voluntarios', { x: ML, y: PAGE_H - 82, size: 13, font: normal, color: rgb(0.85, 0.90, 0.97) });

  // Línea separadora
  page.drawLine({ start: { x: ML, y: PAGE_H - 100 }, end: { x: PAGE_W - MR, y: PAGE_H - 100 }, thickness: 1, color: C.white, opacity: 0.4 });

  // Etiqueta del rol
  page.drawText('MANUAL DE USUARIO', { x: ML, y: PAGE_H - 128, size: 11, font: normal, color: rgb(0.85, 0.90, 0.97) });
  page.drawText(`Rol: ${roleLabel}`, { x: ML, y: PAGE_H - 160, size: 30, font: bold, color: C.white });
  page.drawText(subtitle, { x: ML, y: PAGE_H - 192, size: 11, font: italic, color: rgb(0.90, 0.93, 0.98) });

  // Cuerpo
  page.drawText('Contenido del manual', { x: ML, y: PAGE_H - 270, size: 10, font: bold, color: roleColor });
  page.drawLine({ start: { x: ML, y: PAGE_H - 274 }, end: { x: ML + 180, y: PAGE_H - 274 }, thickness: 1, color: roleColor });

  // Pie de portada
  page.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: 50, color: C.lightGray });
  page.drawText('Uso interno · Confidencial', { x: ML, y: 30, size: 9, font: italic, color: C.muted });
  page.drawText(`Version 1.0  ·  ${fecha}`, { x: PAGE_W - MR - 100, y: 30, size: 9, font: normal, color: C.muted });
}

// ── Generador por rol ─────────────────────────────────────────────────────
async function buildManual({ roleLabel, roleColor, subtitle, sections }) {
  const doc  = await PDFDocument.create();
  const bold   = await doc.embedFont(StandardFonts.HelveticaBold);
  const normal = await doc.embedFont(StandardFonts.Helvetica);
  const italic = await doc.embedFont(StandardFonts.HelveticaOblique);

  const hoy = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });

  // ── Portada ──────────────────────────────────────────────────────────────
  const coverPage = doc.addPage([PAGE_W, PAGE_H]);
  drawCover(coverPage, bold, normal, italic, roleLabel, roleColor, subtitle, hoy);

  // Índice en portada
  let indexY = PAGE_H - 295;
  sections.forEach((sec, i) => {
    coverPage.drawText(`${i + 1}.  ${sec.title}`, {
      x: ML + 10, y: indexY, size: 10, font: normal, color: C.text,
    });
    indexY -= 16;
  });

  // ── Páginas de contenido ─────────────────────────────────────────────────
  const w = new PdfWriter(doc, bold, normal, italic, roleColor);

  for (const sec of sections) {
    w.sectionHeader(sec.title);
    for (const block of sec.content) {
      if (block.type === 'text') {
        w.text(block.value, { size: block.size || 10 });
        w.gap(2);
      } else if (block.type === 'subheader') {
        w.gap(4);
        w.subHeader(block.value);
      } else if (block.type === 'bullet') {
        w.bullet(block.value, { size: block.size || 10 });
      } else if (block.type === 'note') {
        w.note(block.value, block.opts);
      } else if (block.type === 'table') {
        w.table2(block.rows, block.opts);
        w.gap(6);
      } else if (block.type === 'gap') {
        w.gap(block.value || 8);
      }
    }
    w.gap(12);
  }

  return doc.save();
}

// ══════════════════════════════════════════════════════════════════════════
// CONTENIDO DE LOS MANUALES
// ══════════════════════════════════════════════════════════════════════════

// ── ADMIN ─────────────────────────────────────────────────────────────────
const manualAdmin = {
  roleLabel: 'ADMINISTRADOR',
  roleColor: C.admin,
  subtitle: 'Acceso completo al sistema de gestion de voluntarios',
  sections: [
    {
      title: '1. Introduccion al Sistema',
      content: [
        { type: 'text', value: 'El sistema de Asamblea Regional permite gestionar voluntarios, eventos y el proceso de check-in mediante codigos QR. Como Administrador tienes acceso total a todas las funcionalidades del sistema.' },
        { type: 'gap' },
        { type: 'subheader', value: 'Acceso al sistema' },
        { type: 'text', value: 'Abre el navegador y accede a la URL del sistema. Introduce tu nombre de usuario y contrasena. El sistema te redirigira al Dashboard principal.' },
        { type: 'note', value: 'El sistema requiere conexion a internet y funciona mejor en Chrome, Firefox o Safari actualizados. Para escanear QR en moviles, se requiere HTTPS.' },
        { type: 'subheader', value: 'Navegacion principal' },
        { type: 'text', value: 'El panel lateral izquierdo contiene todos los modulos disponibles. Puedes expandirlo o contraerlo con el icono de menu en la barra superior. En dispositivos moviles el menu se oculta automaticamente.' },
      ],
    },
    {
      title: '2. Dashboard',
      content: [
        { type: 'text', value: 'La pantalla principal muestra un resumen en tiempo real del estado del sistema:' },
        { type: 'bullet', value: 'Total de departamentos registrados' },
        { type: 'bullet', value: 'Total de voluntarios activos en el sistema' },
        { type: 'bullet', value: 'Total de eventos creados' },
        { type: 'bullet', value: 'Total de registros de check-in realizados' },
        { type: 'gap' },
        { type: 'text', value: 'Desde el Dashboard puedes navegar directamente a cualquier seccion usando los accesos rapidos o el menu lateral.' },
      ],
    },
    {
      title: '3. Gestion de Departamentos',
      content: [
        { type: 'text', value: 'Los departamentos agrupan a los voluntarios por area de trabajo. Cada voluntario pertenece a uno o varios departamentos.' },
        { type: 'subheader', value: 'Operaciones disponibles' },
        { type: 'bullet', value: 'Crear nuevo departamento: nombre, descripcion, responsable (DNI) y auxiliares (DNIs separados por coma).' },
        { type: 'bullet', value: 'Editar departamento existente.' },
        { type: 'bullet', value: 'Eliminar departamento (solo si no tiene voluntarios asignados).' },
        { type: 'bullet', value: 'Buscar departamentos por nombre.' },
        { type: 'note', value: 'El campo "Responsable" y "Auxiliares" almacenan el DNI del voluntario, no el nombre. Asegurate de introducir el DNI correcto.' },
      ],
    },
    {
      title: '4. Gestion de Roles',
      content: [
        { type: 'text', value: 'Los roles definen el nivel de acceso de cada usuario al sistema. Solo el Administrador puede gestionarlos.' },
        { type: 'gap' },
        { type: 'table2', rows: [
          ['Rol', 'Descripcion de acceso'],
          ['ADMIN', 'Acceso total a todas las funciones del sistema.'],
          ['COORDINADOR', 'Gestion operativa: voluntarios, eventos, asignaciones, estadisticas. Sin panel de administracion.'],
          ['VOLUNTARIO', 'Solo visualiza sus propios pases QR en "Mis Pases".'],
          ['CHECK_IN', 'Acceso exclusivo al modulo de Check-In para escanear QR.'],
        ], opts: { col1W: 120 } },
        { type: 'gap' },
        { type: 'text', value: 'Para crear un nuevo rol o modificar su descripcion, accede al modulo "Roles" en el menu lateral.' },
        { type: 'note', value: 'La asignacion de roles a usuarios se hace desde el Panel de Administracion, no desde este modulo.' },
      ],
    },
    {
      title: '5. Gestion de Voluntarios',
      content: [
        { type: 'text', value: 'El modulo de Voluntarios permite registrar y gestionar a todas las personas que participan como voluntarios en los eventos.' },
        { type: 'subheader', value: 'Registro individual' },
        { type: 'bullet', value: 'Campos obligatorios: Nombre, Apellido 1, DNI, Departamento.' },
        { type: 'bullet', value: 'Campos opcionales: Apellido 2, Telefono, Email, Congregacion, Circuito, Correo JW.' },
        { type: 'bullet', value: 'Estado activo/inactivo: los voluntarios inactivos no aparecen en las asignaciones masivas.' },
        { type: 'bullet', value: 'Campo "Formacion": indica si el voluntario ha asistido a una sesion de formacion.' },
        { type: 'subheader', value: 'Carga masiva desde CSV' },
        { type: 'text', value: 'Puedes importar multiples voluntarios a la vez desde un fichero CSV. Haz clic en "Carga Masiva" y sube el archivo.' },
        { type: 'text', value: 'Formato del CSV (columnas en orden):' },
        { type: 'bullet', value: 'apellido1, apellido2, nombre, dni, congregacion, circuito, departamento, correo_jw, email' },
        { type: 'note', value: 'Los DNIs duplicados son omitidos automaticamente. El CSV debe tener encabezados en la primera fila y estar codificado en UTF-8.' },
        { type: 'subheader', value: 'Busqueda y filtrado' },
        { type: 'text', value: 'Usa la barra de busqueda para filtrar por nombre, apellido o DNI. Puedes filtrar tambien por departamento y estado activo/inactivo.' },
      ],
    },
    {
      title: '6. Formaciones',
      content: [
        { type: 'text', value: 'El modulo de Formaciones registra la asistencia y aprobacion de voluntarios en eventos de tipo FORMACION.' },
        { type: 'subheader', value: 'Flujo de formacion' },
        { type: 'bullet', value: '1. Crea un evento de tipo FORMACION desde el modulo de Eventos.' },
        { type: 'bullet', value: '2. Asigna voluntarios al evento.' },
        { type: 'bullet', value: '3. Cuando el voluntario escanea su QR en el evento de formacion, su asistencia queda registrada automaticamente.' },
        { type: 'bullet', value: '4. El coordinador puede registrar manualmente la asistencia desde este modulo.' },
        { type: 'bullet', value: '5. La aprobacion se registra por separado, indicando el voluntario que certifica la formacion.' },
        { type: 'note', value: 'Al registrar asistencia a una formacion, el campo "Formacion" del voluntario se activa automaticamente.' },
      ],
    },
    {
      title: '7. Gestion de Eventos',
      content: [
        { type: 'text', value: 'Los eventos son las asambleas o actos a los que se asignan voluntarios.' },
        { type: 'subheader', value: 'Campos de un evento' },
        { type: 'bullet', value: 'Nombre del evento.' },
        { type: 'bullet', value: 'Tipo: ASAMBLEA, FORMACION u otro.' },
        { type: 'bullet', value: 'Fecha y hora de inicio y fin.' },
        { type: 'bullet', value: 'Dias Pre-Evento: numero de dias de acceso previos al inicio oficial.' },
        { type: 'bullet', value: 'Departamento organizador.' },
        { type: 'subheader', value: 'Detalle de evento' },
        { type: 'text', value: 'Al hacer clic en un evento accedes a su pantalla de detalle, donde puedes ver y gestionar todas las asignaciones de ese evento, incluyendo generar QR masivos e importar desde Excel (Carga Maestra).' },
        { type: 'subheader', value: 'Importacion masiva desde Excel (Carga Maestra)' },
        { type: 'text', value: 'Desde el detalle de un evento, puedes cargar un fichero .xlsx con todos los voluntarios y sus dias de acceso. El sistema realiza un UPSERT automatico: crea o actualiza voluntarios, departamentos y asignaciones.' },
        { type: 'note', value: 'La Carga Maestra soporta hasta 5.000 filas por archivo. Las columnas deben seguir el formato establecido. Los nuevos campos deben anadirse siempre al final para mantener compatibilidad.' },
      ],
    },
    {
      title: '8. Asignaciones Evento-Voluntario',
      content: [
        { type: 'text', value: 'Gestiona que voluntarios estan asignados a cada evento y sus dias de acceso.' },
        { type: 'subheader', value: 'Asignacion individual' },
        { type: 'text', value: 'Haz clic en "Nueva Asignacion", selecciona el evento y el voluntario. El sistema calcula los dias de acceso por defecto segun la configuracion del evento.' },
        { type: 'subheader', value: 'Asignacion masiva' },
        { type: 'text', value: 'El boton "Asignacion Masiva" permite asignar todos los voluntarios activos de un departamento al evento seleccionado de una sola vez. Los ya asignados se omiten automaticamente.' },
        { type: 'subheader', value: 'Codigos QR' },
        { type: 'bullet', value: 'Cada asignacion tiene un codigo QR unico generado por el sistema.' },
        { type: 'bullet', value: 'Puedes generar el QR de forma individual con el boton "Generar QR" en la fila.' },
        { type: 'bullet', value: '"Descargar PDF": descarga todos los pases de la pagina actual en un solo PDF.' },
        { type: 'bullet', value: '"ZIP por voluntario": genera un PDF individual por voluntario y los empaqueta en un fichero ZIP.' },
        { type: 'bullet', value: '"Excel": exporta las asignaciones visibles a formato Excel.' },
        { type: 'subheader', value: 'Filtros disponibles' },
        { type: 'text', value: 'Puedes filtrar por: texto libre (nombre, DNI), departamento, matricula, y dias de acceso (SI/NO para cada dia del evento).' },
        { type: 'note', value: 'El campo "Matricula" se puede usar para registrar la placa del vehiculo del voluntario, visible en el pase PDF.' },
      ],
    },
    {
      title: '9. Descarga de Pases',
      content: [
        { type: 'text', value: 'El modulo "Descarga de Pases" permite descargar los codigos QR en lote, organizados por evento y departamento.' },
        { type: 'subheader', value: 'Como usar' },
        { type: 'bullet', value: '1. Selecciona el evento en el desplegable.' },
        { type: 'bullet', value: '2. (Opcional) Filtra por departamento.' },
        { type: 'bullet', value: '3. Los voluntarios con QR generado aparecen en la lista.' },
        { type: 'bullet', value: '4. Selecciona los pases que deseas descargar (o "Seleccionar todos").' },
        { type: 'bullet', value: '5. Elige entre "Descargar PDF" (pases combinados) o "Descargar ZIP" (un PDF por voluntario).' },
        { type: 'note', value: 'Los pases con plantilla de departamento (Audio y Video, Instalacion, LBD, etc.) se generan usando las plantillas PDF del sistema. Los demas se generan con el diseno estandar.' },
      ],
    },
    {
      title: '10. Check-In con QR',
      content: [
        { type: 'text', value: 'El modulo de Check-In permite registrar la entrada de voluntarios al evento mediante escaneo de codigo QR.' },
        { type: 'subheader', value: 'Escanear un QR' },
        { type: 'bullet', value: '1. Haz clic en el boton "Escanear QR" (camara).' },
        { type: 'bullet', value: '2. Concede permiso de camara al navegador si se solicita.' },
        { type: 'bullet', value: '3. Apunta la camara al codigo QR del voluntario.' },
        { type: 'bullet', value: '4. El sistema procesa el QR automaticamente y muestra el resultado.' },
        { type: 'bullet', value: '5. Un pitido agudo indica exito; uno grave indica rechazo.' },
        { type: 'bullet', value: '6. Haz clic en "Escanear otro" para continuar con el siguiente voluntario.' },
        { type: 'subheader', value: 'Estados del check-in' },
        { type: 'table2', rows: [
          ['PRESENTE', 'Check-in registrado correctamente para hoy.'],
          ['COMPLETADO', 'El voluntario ya completo su jornada (tiene check-out).'],
          ['RECHAZADO', 'El QR no es valido para hoy (fecha incorrecta, dia sin acceso, ya registrado).'],
          ['EN_PROGRESO', 'Check-in activo, pendiente de check-out.'],
        ], opts: { col1W: 130 } },
        { type: 'subheader', value: 'Historial de check-ins' },
        { type: 'text', value: 'La tabla inferior muestra todos los check-ins registrados. Puedes filtrar por voluntario/evento, estado, y fecha.' },
        { type: 'note', value: 'En iOS (iPhone/iPad), asegurate de usar Safari con HTTPS. El sistema solicita permiso de camara la primera vez que se abre el escaner.', opts: { textColor: C.checkin, color: rgb(1, 0.95, 0.85) } },
      ],
    },
    {
      title: '11. Estadisticas y Reportes',
      content: [
        { type: 'text', value: 'El modulo de Estadisticas ofrece datos agregados sobre la participacion de voluntarios en los eventos.' },
        { type: 'subheader', value: 'Contenido de las estadisticas' },
        { type: 'bullet', value: 'Total de check-ins por evento.' },
        { type: 'bullet', value: 'Grafico de check-ins por dia (serie temporal).' },
        { type: 'bullet', value: 'Check-ins por departamento (grafico de barras).' },
        { type: 'bullet', value: 'Total de voluntarios asignados al evento seleccionado.' },
        { type: 'subheader', value: 'Filtrado por evento' },
        { type: 'text', value: 'Usa el selector de evento en la parte superior para acotar las estadisticas. Si no seleccionas evento, se muestran los datos globales.' },
        { type: 'subheader', value: 'Exportar a Excel' },
        { type: 'text', value: 'El boton "Exportar Excel" descarga un fichero .xlsx con el detalle de todos los check-ins del evento, incluyendo nombre, departamento, fecha/hora y estado.' },
      ],
    },
    {
      title: '12. Mis Pases',
      content: [
        { type: 'text', value: 'El modulo "Mis Pases" muestra los codigos QR de acceso del usuario autenticado.' },
        { type: 'text', value: 'Como Administrador, esta seccion muestra todas las asignaciones de todos los voluntarios (vista global). Un voluntario normal solo ve sus propias asignaciones.' },
        { type: 'bullet', value: 'Cada pase muestra: nombre del evento, fechas, departamento, dias de acceso y codigo QR.' },
        { type: 'bullet', value: 'El boton "Descargar" guarda el QR como imagen PNG.' },
      ],
    },
    {
      title: '13. Panel de Administracion',
      content: [
        { type: 'text', value: 'El Panel de Administracion esta reservado exclusivamente para el rol ADMIN. Permite gestionar los usuarios del sistema.' },
        { type: 'subheader', value: 'Gestion de usuarios' },
        { type: 'bullet', value: 'Ver todos los usuarios registrados con su rol actual.' },
        { type: 'bullet', value: 'Crear nuevo usuario: selecciona un voluntario existente, asigna un rol y establece una contrasena.' },
        { type: 'bullet', value: 'Cambiar el rol de un usuario existente desde la tabla.' },
        { type: 'bullet', value: 'Restablecer contrasena de un usuario.' },
        { type: 'gap' },
        { type: 'subheader', value: 'Limpieza de base de datos' },
        { type: 'text', value: 'La opcion "Limpiar base de datos" elimina TODOS los datos del sistema (voluntarios, eventos, check-ins, usuarios) y crea un nuevo super-administrador.' },
        { type: 'note', value: 'ATENCION: La limpieza de base de datos es IRREVERSIBLE. Al ejecutarla, tu sesion actual quedara invalidada y seras redirigido al login. Usa esta funcion solo en entornos de prueba o al inicio de un nuevo ciclo.', opts: { textColor: C.accent, color: rgb(1, 0.93, 0.88) } },
      ],
    },
  ],
};

// ── COORDINADOR ───────────────────────────────────────────────────────────
const manualCoordinador = {
  roleLabel: 'COORDINADOR',
  roleColor: C.coord,
  subtitle: 'Gestion operativa de voluntarios y eventos',
  sections: [
    {
      title: '1. Introduccion',
      content: [
        { type: 'text', value: 'El rol de Coordinador tiene acceso a todas las funciones operativas del sistema: gestion de voluntarios, eventos, asignaciones, check-in y estadisticas. No tiene acceso al panel de administracion de usuarios ni a la gestion de roles.' },
        { type: 'gap' },
        { type: 'subheader', value: 'Inicio de sesion' },
        { type: 'text', value: 'Accede con tu nombre de usuario y contrasena. El sistema te redirigira al Dashboard principal.' },
        { type: 'note', value: 'Si olvidas tu contrasena, usa el enlace "Recuperar contrasena" en la pantalla de login, o contacta con el Administrador.' },
      ],
    },
    {
      title: '2. Dashboard',
      content: [
        { type: 'text', value: 'La pantalla principal muestra estadisticas en tiempo real: departamentos, voluntarios, eventos y check-ins. Usa el menu lateral para navegar a cada seccion.' },
      ],
    },
    {
      title: '3. Gestion de Departamentos',
      content: [
        { type: 'text', value: 'Accede a los departamentos para ver, crear y editar las areas de trabajo de los voluntarios.' },
        { type: 'bullet', value: 'Ver listado de departamentos con responsable y auxiliares.' },
        { type: 'bullet', value: 'Crear y editar departamentos (nombre, descripcion, responsable/auxiliares por DNI).' },
        { type: 'bullet', value: 'Eliminar departamentos sin voluntarios asignados.' },
      ],
    },
    {
      title: '4. Gestion de Voluntarios',
      content: [
        { type: 'subheader', value: 'Registro y edicion' },
        { type: 'text', value: 'Registra voluntarios individualmente o importa desde un fichero CSV. Los campos obligatorios son Nombre, Apellido 1, DNI y Departamento.' },
        { type: 'subheader', value: 'Carga masiva CSV' },
        { type: 'text', value: 'Formato de columnas: apellido1, apellido2, nombre, dni, congregacion, circuito, departamento, correo_jw, email. Los DNIs duplicados se omiten automaticamente.' },
        { type: 'subheader', value: 'Busqueda' },
        { type: 'text', value: 'Filtra por nombre, DNI, departamento o estado activo/inactivo. Los voluntarios inactivos no se incluyen en asignaciones masivas.' },
      ],
    },
    {
      title: '5. Formaciones',
      content: [
        { type: 'text', value: 'Gestiona la asistencia y aprobacion en eventos de tipo FORMACION.' },
        { type: 'bullet', value: '1. Crea el evento de formacion en el modulo Eventos.' },
        { type: 'bullet', value: '2. Asigna los voluntarios al evento.' },
        { type: 'bullet', value: '3. La asistencia se registra automaticamente al escanear el QR, o manualmente desde este modulo.' },
        { type: 'bullet', value: '4. Registra la aprobacion indicando el voluntario que certifica.' },
        { type: 'note', value: 'El campo "Formacion" del voluntario se activa automaticamente al registrar asistencia.' },
      ],
    },
    {
      title: '6. Gestion de Eventos',
      content: [
        { type: 'text', value: 'Crea y gestiona los eventos (asambleas, formaciones). Cada evento tiene nombre, tipo, fechas, dias pre-evento y departamento.' },
        { type: 'subheader', value: 'Detalle del evento' },
        { type: 'text', value: 'Haz clic en un evento para acceder a su detalle: puedes ver todas las asignaciones, generar QR masivos e importar desde Excel (Carga Maestra, hasta 5.000 filas).' },
        { type: 'note', value: 'La Carga Maestra realiza un UPSERT automatico: crea o actualiza voluntarios, departamentos y asignaciones segun el contenido del Excel.' },
      ],
    },
    {
      title: '7. Asignaciones Evento-Voluntario',
      content: [
        { type: 'text', value: 'Controla que voluntarios estan asignados a cada evento y sus dias de acceso.' },
        { type: 'subheader', value: 'Acciones disponibles' },
        { type: 'bullet', value: 'Asignacion individual: selecciona voluntario y evento.' },
        { type: 'bullet', value: 'Asignacion masiva: asigna todos los activos de un departamento de golpe.' },
        { type: 'bullet', value: 'Generar QR: genera el codigo QR de una asignacion.' },
        { type: 'bullet', value: 'Descargar PDF: todos los pases visibles en un PDF.' },
        { type: 'bullet', value: 'ZIP por voluntario: un PDF individual por voluntario en un ZIP.' },
        { type: 'bullet', value: 'Exportar Excel: datos filtrados en formato .xlsx.' },
        { type: 'subheader', value: 'Filtros' },
        { type: 'text', value: 'Busca por nombre/DNI, filtra por departamento, matricula o dias de acceso (SI/NO por dia).' },
      ],
    },
    {
      title: '8. Descarga de Pases',
      content: [
        { type: 'text', value: 'Descarga codigos QR en lote por evento y departamento.' },
        { type: 'bullet', value: '1. Selecciona el evento.' },
        { type: 'bullet', value: '2. Filtra por departamento si es necesario.' },
        { type: 'bullet', value: '3. Selecciona los pases a descargar.' },
        { type: 'bullet', value: '4. Elige PDF combinado o ZIP individual.' },
      ],
    },
    {
      title: '9. Check-In con QR',
      content: [
        { type: 'text', value: 'Registra entradas de voluntarios escaneando su QR personal.' },
        { type: 'subheader', value: 'Pasos para escanear' },
        { type: 'bullet', value: '1. Haz clic en "Escanear QR".' },
        { type: 'bullet', value: '2. Concede permiso de camara.' },
        { type: 'bullet', value: '3. Apunta al QR del voluntario.' },
        { type: 'bullet', value: '4. El resultado aparece en pantalla (exito o rechazo con motivo).' },
        { type: 'bullet', value: '5. Haz clic en "Escanear otro" para continuar.' },
        { type: 'subheader', value: 'Observaciones' },
        { type: 'text', value: 'Puedes anadir un comentario antes de escanear. El sistema anota automaticamente si el check-in es fuera de horario o fuera de los dias asignados.' },
        { type: 'note', value: 'Solo se permite un check-in por voluntario por dia. Los check-ins de dias anteriores sin cierre se cierran automaticamente a las 23:59.' },
      ],
    },
    {
      title: '10. Estadisticas',
      content: [
        { type: 'text', value: 'Visualiza la participacion por evento, departamento y fecha. Exporta los datos a Excel con el boton correspondiente.' },
        { type: 'bullet', value: 'Filtra por evento para ver datos especificos.' },
        { type: 'bullet', value: 'Graficas de barras y lineas para analisis visual.' },
        { type: 'bullet', value: 'Exportacion a .xlsx para analisis externo.' },
      ],
    },
    {
      title: '11. Mis Pases',
      content: [
        { type: 'text', value: 'Como Coordinador, puedes ver todos los pases QR del sistema en esta seccion. Un voluntario solo ve los suyos propios.' },
        { type: 'bullet', value: 'Visualiza el QR de cada asignacion.' },
        { type: 'bullet', value: 'Descarga el QR como imagen PNG.' },
      ],
    },
  ],
};

// ── VOLUNTARIO ────────────────────────────────────────────────────────────
const manualVoluntario = {
  roleLabel: 'VOLUNTARIO',
  roleColor: C.vol,
  subtitle: 'Acceso a tus pases QR de voluntario',
  sections: [
    {
      title: '1. Introduccion',
      content: [
        { type: 'text', value: 'Como Voluntario, tienes acceso a una vista simplificada del sistema centrada en tus propios pases de acceso QR. No puedes ver ni modificar informacion de otros voluntarios.' },
        { type: 'subheader', value: 'Inicio de sesion' },
        { type: 'text', value: 'Accede con el nombre de usuario y contrasena que te ha proporcionado el coordinador o administrador del evento.' },
        { type: 'note', value: 'Si no tienes credenciales de acceso, contacta con el responsable de tu departamento o con el coordinador del evento.' },
      ],
    },
    {
      title: '2. Dashboard',
      content: [
        { type: 'text', value: 'La pantalla principal muestra un resumen general del sistema. Desde aqui puedes navegar a "Mis Pases" usando el menu lateral.' },
      ],
    },
    {
      title: '3. Mis Pases',
      content: [
        { type: 'text', value: 'Esta es tu seccion principal. Aqui encontraras los codigos QR de acceso para los eventos a los que estas asignado.' },
        { type: 'subheader', value: 'Informacion de cada pase' },
        { type: 'bullet', value: 'Nombre del evento al que estas asignado.' },
        { type: 'bullet', value: 'Departamento en el que participas.' },
        { type: 'bullet', value: 'Fecha de inicio y fin del evento.' },
        { type: 'bullet', value: 'Dias de acceso asignados (o "Todos los dias del evento" si no hay restriccion).' },
        { type: 'bullet', value: 'Codigo QR unico para tu acceso.' },
        { type: 'subheader', value: 'Como usar el pase' },
        { type: 'text', value: 'Muestra el codigo QR de la pantalla al personal de check-in al llegar al evento. El sistema registrara tu entrada automaticamente.' },
        { type: 'subheader', value: 'Descargar el QR' },
        { type: 'text', value: 'Puedes guardar el codigo QR como imagen PNG en tu dispositivo haciendo clic en el boton "Descargar". Asi podras acceder sin necesidad de internet el dia del evento.' },
        { type: 'note', value: 'Si no ves ningun pase, es posible que aun no hayas sido asignado al evento, o que el QR aun no haya sido generado. Contacta con tu coordinador.' },
        { type: 'subheader', value: 'Dias de acceso' },
        { type: 'text', value: 'En el pase se muestran los dias en los que tienes acceso autorizado. Si intentas acceder un dia no autorizado, el sistema rechazara el check-in.' },
        { type: 'note', value: 'El check-in solo se puede realizar una vez por dia. Si ya has hecho check-in hoy, el sistema te lo informara si intentas escanear de nuevo.' },
      ],
    },
    {
      title: '4. Preguntas Frecuentes',
      content: [
        { type: 'subheader', value: 'No veo mi pase QR' },
        { type: 'text', value: 'Puede deberse a que: (1) aun no has sido asignado al evento, (2) el QR aun no ha sido generado por el coordinador, o (3) el evento aun no ha comenzado.' },
        { type: 'gap' },
        { type: 'subheader', value: 'El QR ha sido rechazado' },
        { type: 'text', value: 'El QR puede ser rechazado por las siguientes razones: (1) el dia de hoy no esta en tus dias de acceso asignados, (2) ya realizaste check-in hoy, (3) el evento aun no ha comenzado o ya ha finalizado.' },
        { type: 'gap' },
        { type: 'subheader', value: 'Cambio de contrasena' },
        { type: 'text', value: 'Contacta con el Administrador o Coordinador para que te restablezca la contrasena. No hay opcion de auto-reset para el rol Voluntario.' },
      ],
    },
  ],
};

// ── CHECK_IN ──────────────────────────────────────────────────────────────
const manualCheckIn = {
  roleLabel: 'CHECK-IN',
  roleColor: C.checkin,
  subtitle: 'Registro de entrada de voluntarios mediante QR',
  sections: [
    {
      title: '1. Introduccion',
      content: [
        { type: 'text', value: 'El rol CHECK-IN esta disenado para el personal responsable de registrar la entrada de voluntarios en los puntos de acceso del evento. Solo tiene acceso al modulo de Check-In.' },
        { type: 'subheader', value: 'Inicio de sesion' },
        { type: 'text', value: 'Accede con tus credenciales. El sistema te redirigira directamente a la pantalla de Check-In, que es la unica seccion accesible para este rol.' },
        { type: 'note', value: 'Para este rol se recomienda usar un dispositivo movil (tablet o smartphone) con conexion estable y camara trasera de buena calidad.' },
      ],
    },
    {
      title: '2. Pantalla Principal de Check-In',
      content: [
        { type: 'text', value: 'La pantalla de Check-In consta de dos partes:' },
        { type: 'bullet', value: 'Boton "Escanear QR": abre el escaner de camara para registrar la entrada de un voluntario.' },
        { type: 'bullet', value: 'Tabla de historial: muestra todos los check-ins registrados, con opciones de filtrado.' },
        { type: 'subheader', value: 'Filtros del historial' },
        { type: 'bullet', value: 'Busqueda por texto: filtra por nombre de voluntario, evento u observaciones.' },
        { type: 'bullet', value: 'Filtro por evento: selecciona un evento especifico.' },
        { type: 'bullet', value: 'Filtro por estado: PRESENTE, COMPLETADO, RECHAZADO, etc.' },
        { type: 'bullet', value: 'Filtro por fecha: muestra solo los check-ins de un dia concreto.' },
        { type: 'bullet', value: '"Limpiar filtros": restablece todos los filtros de una vez.' },
      ],
    },
    {
      title: '3. Escanear un Codigo QR',
      content: [
        { type: 'subheader', value: 'Procedimiento paso a paso' },
        { type: 'bullet', value: 'Paso 1: Haz clic en el boton "Escanear QR" de la parte superior.' },
        { type: 'bullet', value: 'Paso 2: Si el navegador lo solicita, concede permiso de acceso a la camara.' },
        { type: 'bullet', value: 'Paso 3: Apunta la camara al codigo QR del pase del voluntario. Mantente a unos 15-30 cm de distancia.' },
        { type: 'bullet', value: 'Paso 4: El sistema lee el QR automaticamente (no hay que pulsar ningun boton).' },
        { type: 'bullet', value: 'Paso 5: Se muestra el resultado en pantalla: exito (verde) o rechazo (rojo).' },
        { type: 'bullet', value: 'Paso 6: Para el siguiente voluntario, haz clic en "Escanear otro".' },
        { type: 'subheader', value: 'Campo de observaciones' },
        { type: 'text', value: 'Antes de escanear, puedes escribir una observacion en el campo de texto (por ejemplo: "accede con retraso", "acceso especial"). Esta nota quedara registrada junto al check-in.' },
        { type: 'note', value: 'El sistema emite sonidos: un pitido agudo indica exito, dos tonos descendentes indican rechazo. Asegurate de tener el volumen activo en el dispositivo.' },
      ],
    },
    {
      title: '4. Resultados del Escaneo',
      content: [
        { type: 'subheader', value: 'Resultado exitoso' },
        { type: 'text', value: 'Aparece una pantalla verde con icono de verificacion mostrando:' },
        { type: 'bullet', value: 'Nombre completo del voluntario.' },
        { type: 'bullet', value: 'Nombre del evento.' },
        { type: 'bullet', value: 'Fecha y hora del check-in.' },
        { type: 'bullet', value: 'Matricula del vehiculo (si el voluntario la tiene registrada).' },
        { type: 'gap' },
        { type: 'subheader', value: 'Resultado rechazado' },
        { type: 'text', value: 'Aparece una pantalla roja con el motivo del rechazo:' },
        { type: 'table2', rows: [
          ['Motivo de rechazo', 'Causa'],
          ['Acceso no permitido: periodo no ha comenzado', 'El evento aun no ha empezado segun el calendario.'],
          ['Acceso no permitido: evento finalizado', 'El evento ya ha terminado.'],
          ['No tiene acceso para hoy', 'El voluntario no tiene este dia en su lista de acceso.'],
          ['Ya existe un check-in para hoy', 'El voluntario ya fue registrado hoy.'],
        ], opts: { col1W: 200 } },
        { type: 'gap' },
        { type: 'note', value: 'Todos los intentos rechazados quedan registrados en el historial con estado RECHAZADO y el motivo del rechazo. Esto facilita la auditoria.' },
      ],
    },
    {
      title: '5. Uso en Dispositivos iOS (iPhone/iPad)',
      content: [
        { type: 'text', value: 'Para usar el escaner en dispositivos Apple, ten en cuenta lo siguiente:' },
        { type: 'bullet', value: 'Usa el navegador Safari (no Chrome ni Firefox en iOS, ya que no tienen acceso a la camara por restricciones del sistema).' },
        { type: 'bullet', value: 'El sistema debe estar en HTTPS para que Safari permita acceso a la camara.' },
        { type: 'bullet', value: 'La primera vez que uses el escaner, Safari pedira permiso de camara. Acepta para continuar.' },
        { type: 'bullet', value: 'Si el escaner falla al reiniciarse, espera un momento y vuelve a intentarlo.' },
        { type: 'note', value: 'Si el permiso de camara fue denegado, ve a Ajustes > Safari > Camara y cambialo a "Permitir".' },
      ],
    },
    {
      title: '6. Historial y Auditoría',
      content: [
        { type: 'text', value: 'El historial de check-ins muestra todas las entradas registradas, ordenadas de mas reciente a mas antigua.' },
        { type: 'subheader', value: 'Columnas del historial' },
        { type: 'table2', rows: [
          ['Columna', 'Descripcion'],
          ['ID', 'Identificador unico del registro.'],
          ['Voluntario', 'Nombre completo del voluntario.'],
          ['Evento', 'Nombre del evento al que pertenece.'],
          ['Fecha Check-In', 'Fecha y hora de entrada.'],
          ['Fecha Check-Out', 'Fecha y hora de salida (si se registro).'],
          ['Estado', 'PRESENTE, COMPLETADO, RECHAZADO, etc.'],
          ['Observaciones', 'Notas manuales o mensajes automaticos del sistema.'],
        ], opts: { col1W: 130 } },
        { type: 'gap' },
        { type: 'note', value: 'Las observaciones con icono de advertencia (triangulo amarillo) indican check-ins fuera de horario o con incidencias. Revisalas si es necesario.' },
      ],
    },
  ],
};

// ══════════════════════════════════════════════════════════════════════════
// EJECUCION
// ══════════════════════════════════════════════════════════════════════════
async function run() {
  const manuals = [
    { def: manualAdmin,       file: 'Manual_ADMIN.pdf' },
    { def: manualCoordinador, file: 'Manual_COORDINADOR.pdf' },
    { def: manualVoluntario,  file: 'Manual_VOLUNTARIO.pdf' },
    { def: manualCheckIn,     file: 'Manual_CHECKIN.pdf' },
  ];

  for (const { def, file } of manuals) {
    process.stdout.write(`Generando ${file}...`);
    const bytes = await buildManual(def);
    writeFileSync(resolve(OUT_DIR, file), bytes);
    console.log(' OK');
  }
  console.log(`\nManuales guardados en: ${OUT_DIR}`);
}

run().catch(err => { console.error(err); process.exit(1); });
