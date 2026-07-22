import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormControl, FormGroup } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { forkJoin } from 'rxjs';
import JSZip from 'jszip';
import * as QRCode from 'qrcode';
import { EventoVoluntarioService } from '@app/services/evento-voluntario.service';
import { EventoService } from '@app/services/evento.service';
import { VoluntarioService } from '@app/services/voluntario.service';
import { DepartamentoService } from '@app/services/departamento.service';
import { QrPdfService } from '@app/services/qr-pdf.service';
import { EventoVoluntarioDTO } from '@app/models/evento-voluntario.model';
import { EventoDTO } from '@app/models/evento.model';
import { VoluntarioDTO } from '@app/models/voluntario.model';
import { DepartamentoDTO } from '@app/models/departamento.model';

export interface AsignacionConQr extends EventoVoluntarioDTO {
  seleccionada: boolean;
}

@Component({
  selector: 'app-descarga-qr',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatFormFieldModule,
    MatInputModule,
    MatAutocompleteModule,
    MatProgressSpinnerModule,
    MatProgressBarModule,
    MatCheckboxModule,
    MatTooltipModule,
    MatSnackBarModule,
    TranslateModule
  ],
  templateUrl: './descarga-qr.component.html',
  styleUrls: ['./descarga-qr.component.scss']
})
export class DescargaQrComponent implements OnInit {
  form!: FormGroup;

  /** Control del autocomplete de departamento (texto de búsqueda o departamento seleccionado) */
  departamentoCtrl = new FormControl<string | DepartamentoDTO | null>({ value: null, disabled: true });
  departamentosAutocompletados: DepartamentoDTO[] = [];

  /** Control del autocomplete de voluntario (texto de búsqueda o voluntario seleccionado) */
  voluntarioCtrl = new FormControl<string | VoluntarioDTO | null>({ value: null, disabled: true });
  voluntariosFiltrados: VoluntarioDTO[] = [];

  // Datos maestros (carga rápida en mount)
  eventos: EventoDTO[] = [];
  voluntarios: VoluntarioDTO[] = [];
  departamentos: DepartamentoDTO[] = [];
  /** Departamentos con voluntarios (con pase) en el evento seleccionado */
  departamentosFiltrados: DepartamentoDTO[] = [];

  // QRs cargados bajo demanda al seleccionar evento
  todasAsignaciones: EventoVoluntarioDTO[] = [];
  asignacionesFiltradas: AsignacionConQr[] = [];

  // Estados
  loadingDatos = true;
  loadingQrs = false;
  descargando = false;
  generandoPdf = false;
  progresoDescarga = 0;

  readonly skeletonItems = Array(8).fill(0);

  constructor(
    private fb: FormBuilder,
    private eventoVoluntarioService: EventoVoluntarioService,
    private eventoService: EventoService,
    private voluntarioService: VoluntarioService,
    private departamentoService: DepartamentoService,
    private qrPdfService: QrPdfService,
    private snackBar: MatSnackBar,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      eventoId: [null],
      departamentoId: [{ value: null, disabled: true }],
      voluntarioId:   [{ value: null, disabled: true }]
    });

    // Evento seleccionado → habilitar filtros secundarios y cargar QRs
    this.form.get('eventoId')!.valueChanges.subscribe(id => {
      // Al cambiar de evento se resetea la cascada de filtros
      this.form.get('departamentoId')!.setValue(null, { emitEvent: false });
      this.form.get('voluntarioId')!.setValue(null, { emitEvent: false });
      this.departamentoCtrl.setValue(null, { emitEvent: false });
      this.voluntarioCtrl.setValue(null, { emitEvent: false });
      if (id) {
        this.form.get('departamentoId')!.enable({ emitEvent: false });
        this.form.get('voluntarioId')!.enable({ emitEvent: false });
        this.departamentoCtrl.enable({ emitEvent: false });
        this.voluntarioCtrl.enable({ emitEvent: false });
        this.cargarQrParaEvento(id);
      } else {
        this.form.get('departamentoId')!.disable({ emitEvent: false });
        this.form.get('voluntarioId')!.disable({ emitEvent: false });
        this.departamentoCtrl.disable({ emitEvent: false });
        this.voluntarioCtrl.disable({ emitEvent: false });
        this.generacionQrId++; // aborta la generación de QRs en curso
        this.todasAsignaciones = [];
        this.asignacionesFiltradas = [];
        this.departamentosFiltrados = this.departamentos;
        this.departamentosAutocompletados = this.departamentos;
        this.voluntariosFiltrados = this.filtrarVoluntarios('');
      }
    });

    // Autocomplete de departamento: filtra opciones al teclear y fija departamentoId al seleccionar.
    this.departamentoCtrl.valueChanges.subscribe(val => {
      if (val && typeof val === 'object') {
        this.form.get('departamentoId')!.setValue(val.id, { emitEvent: true });
      } else {
        this.departamentosAutocompletados = this.filtrarDepartamentos(val ?? '');
        if (this.form.getRawValue().departamentoId != null) {
          this.form.get('departamentoId')!.setValue(null, { emitEvent: true });
        }
      }
    });

    // Autocomplete de voluntario: filtra opciones al teclear y fija voluntarioId al seleccionar.
    // La búsqueda sobre los pases no se lanza hasta pulsar "Buscar".
    this.voluntarioCtrl.valueChanges.subscribe(val => {
      if (val && typeof val === 'object') {
        this.form.get('voluntarioId')!.setValue(val.id, { emitEvent: false });
      } else {
        this.voluntariosFiltrados = this.filtrarVoluntarios(val ?? '');
        if (this.form.getRawValue().voluntarioId != null) {
          this.form.get('voluntarioId')!.setValue(null, { emitEvent: false });
        }
      }
    });

    // Cascada: al cambiar el departamento se restringe el autocomplete de voluntarios
    // (y se descarta el voluntario seleccionado si ya no pertenece al filtro)
    this.form.get('departamentoId')!.valueChanges.subscribe(deptoId => {
      const sel = this.voluntarioCtrl.value;
      if (sel && typeof sel === 'object' && deptoId != null
          && !(sel.departamentoIds ?? []).includes(deptoId)) {
        this.voluntarioCtrl.setValue(null, { emitEvent: false });
        this.form.get('voluntarioId')!.setValue(null, { emitEvent: false });
      }
      const texto = typeof this.voluntarioCtrl.value === 'string' ? this.voluntarioCtrl.value : '';
      this.voluntariosFiltrados = this.filtrarVoluntarios(texto);
    });

    // Carga inicial ligera: solo catálogos (sin imágenes QR)
    forkJoin({
      eventos: this.eventoService.getAll(),
      voluntarios: this.voluntarioService.getAll(),
      departamentos: this.departamentoService.getAll()
    }).subscribe({
      next: ({ eventos, voluntarios, departamentos }) => {
        this.eventos = eventos;
        this.voluntarios = voluntarios;
        this.departamentos = departamentos;
        this.departamentosFiltrados = departamentos;
        this.departamentosAutocompletados = departamentos;
        this.voluntariosFiltrados = this.filtrarVoluntarios('');
        this.loadingDatos = false;
      },
      error: () => {
        this.loadingDatos = false;
        this.snackBar.open(
          this.translate.instant('DescargaQr.Snack.LoadError'),
          this.translate.instant('Common.Close'),
          { duration: 4000 }
        );
      }
    });
  }

  get eventoSeleccionado(): EventoDTO | null {
    const id = this.form.value.eventoId;
    return id ? (this.eventos.find(e => e.id === id) ?? null) : null;
  }

  private cargarQrParaEvento(eventoId: number): void {
    this.loadingQrs = true;
    this.todasAsignaciones = [];
    this.asignacionesFiltradas = [];

    // Solo tokens (sin imágenes): el PNG de cada QR se genera en el cliente
    this.eventoVoluntarioService.getByEvento(eventoId, undefined, false).subscribe({
      next: (asignaciones) => {
        this.todasAsignaciones = asignaciones.filter(a => !!a.qrToken);
        this.loadingQrs = false;
        this.actualizarCascada();
        this.aplicarFiltros();
        this.generarImagenesEnSegundoPlano();
      },
      error: () => {
        this.loadingQrs = false;
        this.snackBar.open(
          this.translate.instant('DescargaQr.Snack.LoadError'),
          this.translate.instant('Common.Close'),
          { duration: 4000 }
        );
      }
    });
  }

  /** Lanza la búsqueda con los filtros actuales (botón "Buscar"). */
  buscar(): void {
    this.aplicarFiltros();
  }

  /**
   * Restringe los catálogos de la cascada al evento cargado:
   * solo departamentos con voluntarios (con pase) en el evento.
   */
  private actualizarCascada(): void {
    const idsEvento = new Set(this.todasAsignaciones.map(a => a.voluntarioId));
    const deptIds = new Set<number>();
    this.voluntarios
      .filter(v => idsEvento.has(v.id!))
      .forEach(v => (v.departamentoIds ?? []).forEach(d => deptIds.add(d)));
    this.departamentosFiltrados = this.departamentos.filter(d => d.id != null && deptIds.has(d.id));
    this.departamentosAutocompletados = this.departamentosFiltrados;
    this.voluntariosFiltrados = this.filtrarVoluntarios('');
  }

  aplicarFiltros(): void {
    const { departamentoId, voluntarioId } = this.form.getRawValue();

    let resultado = [...this.todasAsignaciones];

    if (voluntarioId) {
      resultado = resultado.filter(a => a.voluntarioId === voluntarioId);
    }

    if (departamentoId) {
      const voluntariosDelDepto = this.voluntarios
        .filter(v => (v.departamentoIds ?? []).includes(departamentoId))
        .map(v => v.id);
      resultado = resultado.filter(a => voluntariosDelDepto.includes(a.voluntarioId));
    }

    // Mismas referencias que todasAsignaciones: así las imágenes QR generadas
    // en segundo plano aparecen en las tarjetas sin re-filtrar
    resultado.forEach(a => ((a as AsignacionConQr).seleccionada = true));
    this.asignacionesFiltradas = resultado as AsignacionConQr[];
  }

  get seleccionadas(): AsignacionConQr[] {
    return this.asignacionesFiltradas.filter(a => a.seleccionada);
  }

  get todasSeleccionadas(): boolean {
    return this.asignacionesFiltradas.length > 0 &&
      this.asignacionesFiltradas.every(a => a.seleccionada);
  }

  get algunaSeleccionada(): boolean {
    return this.asignacionesFiltradas.some(a => a.seleccionada) && !this.todasSeleccionadas;
  }

  toggleTodas(checked: boolean): void {
    this.asignacionesFiltradas.forEach(a => a.seleccionada = checked);
  }

  limpiarFiltros(): void {
    this.form.get('departamentoId')!.setValue(null, { emitEvent: false });
    this.form.get('voluntarioId')!.setValue(null, { emitEvent: false });
    this.departamentoCtrl.setValue(null, { emitEvent: false });
    this.voluntarioCtrl.setValue(null, { emitEvent: false });
    this.departamentosAutocompletados = this.departamentosFiltrados;
    this.voluntariosFiltrados = this.filtrarVoluntarios('');
    // Limpiar sí aplica de inmediato: vuelve a mostrar todos los pases del evento
    this.aplicarFiltros();
  }

  /**
   * Autocomplete en cascada: voluntarios asignados (con pase) al evento cargado,
   * restringidos al departamento elegido, buscando por nombre, apellidos o DNI
   * (máx. 50 resultados).
   */
  private filtrarVoluntarios(query: string): VoluntarioDTO[] {
    const q = query.trim().toLowerCase();
    const { departamentoId } = this.form.getRawValue();

    let base = this.voluntarios;
    if (this.todasAsignaciones.length > 0) {
      const idsEvento = new Set(this.todasAsignaciones.map(a => a.voluntarioId));
      base = base.filter(v => v.id != null && idsEvento.has(v.id));
    }
    if (departamentoId != null) {
      base = base.filter(v => (v.departamentoIds ?? []).includes(departamentoId));
    }
    if (q) {
      base = base.filter(v =>
        `${v.nombre} ${v.apellido1} ${v.apellido2 ?? ''} ${v.dni}`.toLowerCase().includes(q));
    }
    return base.slice(0, 50);
  }

  displayDepartamento = (d: DepartamentoDTO | string | null): string => {
    if (!d) return '';
    if (typeof d === 'string') return d;
    return d.nombre;
  };

  private filtrarDepartamentos(query: string): DepartamentoDTO[] {
    const q = query.trim().toLowerCase();
    if (!q) return this.departamentosFiltrados;
    return this.departamentosFiltrados.filter(d => d.nombre.toLowerCase().includes(q));
  }

  displayVoluntario = (v: VoluntarioDTO | string | null): string => {
    if (!v) return '';
    if (typeof v === 'string') return v;
    return [v.nombre, v.apellido1, v.apellido2].filter(Boolean).join(' ');
  };

  getVoluntarioDepartamento(voluntarioId: number): string {
    const v = this.voluntarios.find(vol => vol.id === voluntarioId);
    return (v?.departamentoNombres ?? []).join(' | ') || '—';
  }

  /** Días a los que tiene acceso el voluntario. Sin diasAcceso = acceso completo al evento. */
  formatearDiasAcceso(a: EventoVoluntarioDTO): string {
    if (!a.diasAcceso?.trim()) return 'Todos los días del evento';
    return a.diasAcceso.split('|')
      .map(d => d.trim())
      .filter(Boolean)
      .sort()
      .map(d => {
        const [, m, dd] = d.split('-');
        return `${dd}/${m}`;
      })
      .join(' · ');
  }

  getQrSrc(base64: string): string {
    return `data:image/png;base64,${base64}`;
  }

  // ── Generación de imágenes QR en el cliente (a partir del token) ──────────

  /** Se incrementa al cambiar de evento para cancelar generaciones en curso. */
  private generacionQrId = 0;

  /**
   * Genera los PNG de todos los pases cargados por lotes, cediendo el hilo
   * entre lotes para no congelar la UI (~1 ms por QR).
   */
  private async generarImagenesEnSegundoPlano(): Promise<void> {
    const gen = ++this.generacionQrId;
    const LOTE = 50;
    for (let i = 0; i < this.todasAsignaciones.length; i++) {
      if (gen !== this.generacionQrId) return; // el evento cambió: abortar
      const a = this.todasAsignaciones[i];
      if (a.qrToken && !a.qrImageBase64) {
        a.qrImageBase64 = await this.generarImagenQr(a.qrToken);
      }
      if ((i + 1) % LOTE === 0) {
        await new Promise(resolve => setTimeout(resolve));
      }
    }
  }

  private async generarImagenQr(token: string): Promise<string> {
    const dataUrl = await QRCode.toDataURL(token, { width: 240, margin: 1 });
    return dataUrl.substring(dataUrl.indexOf(',') + 1);
  }

  /** Garantiza que todos los elementos tienen su PNG antes de descargar. */
  private async asegurarImagenesQr(lista: EventoVoluntarioDTO[]): Promise<void> {
    for (const a of lista) {
      if (a.qrToken && !a.qrImageBase64) {
        a.qrImageBase64 = await this.generarImagenQr(a.qrToken);
      }
    }
  }

  private getNombreArchivo(a: EventoVoluntarioDTO): string {
    const vol = (a.voluntarioNombre || 'Voluntario').replace(/\s+/g, '_');
    const ev = (a.eventoNombre || 'Evento').replace(/\s+/g, '_');
    return `QR_${vol}_${ev}.png`;
  }

  async descargarIndividual(a: AsignacionConQr): Promise<void> {
    await this.asegurarImagenesQr([a]);
    const link = document.createElement('a');
    link.href = this.getQrSrc(a.qrImageBase64!);
    link.download = this.getNombreArchivo(a);
    link.click();
  }

  async descargarPasePdf(a: AsignacionConQr): Promise<void> {
    await this.asegurarImagenesQr([a]);
    const vol = this.voluntarios.find(v => v.id === a.voluntarioId);
    const nombre = vol ? `${vol.nombre}_${vol.apellido1}` : (a.voluntarioNombre || 'pase');
    await this.qrPdfService.generarPdf(
      [a],
      this.voluntarios,
      `Pase_${nombre.replace(/\s+/g, '_')}.pdf`
    );
  }

  async descargarPasesPdf(): Promise<void> {
    const lista = this.seleccionadas;
    if (lista.length === 0) return;

    await this.asegurarImagenesQr(lista);

    // Un solo pase → PDF directo sin ZIP
    if (lista.length === 1) {
      await this.descargarPasePdf(lista[0]);
      return;
    }

    this.generandoPdf = true;
    try {
      const evento = this.eventoSeleccionado;
      const nombreEvento = (evento?.nombre ?? 'evento').replace(/\s+/g, '_');

      const nombreZip = `Pases_${nombreEvento}.zip`;
      await this.qrPdfService.generarZipPorDepartamento(lista, this.voluntarios, nombreZip);

      this.snackBar.open(
        this.translate.instant('DescargaQr.Snack.Downloaded', { count: lista.length }),
        this.translate.instant('Common.Close'),
        { duration: 3000, panelClass: ['success-snackbar'] }
      );
    } catch {
      this.snackBar.open(
        this.translate.instant('DescargaQr.Snack.ZipError'),
        this.translate.instant('Common.Close'),
        { duration: 4000 }
      );
    } finally {
      this.generandoPdf = false;
    }
  }

  async descargarZip(): Promise<void> {
    const lista = this.seleccionadas;
    if (lista.length === 0) return;

    if (lista.length === 1) {
      await this.descargarIndividual(lista[0]);
      return;
    }

    await this.asegurarImagenesQr(lista);

    this.descargando = true;
    this.progresoDescarga = 0;

    try {
      const zip = new JSZip();
      const carpeta = zip.folder('QR_Acceso')!;

      for (let i = 0; i < lista.length; i++) {
        const a = lista[i];
        const byteString = atob(a.qrImageBase64!);
        const bytes = new Uint8Array(byteString.length);
        for (let j = 0; j < byteString.length; j++) {
          bytes[j] = byteString.charCodeAt(j);
        }
        carpeta.file(this.getNombreArchivo(a), bytes);
        this.progresoDescarga = Math.round(((i + 1) / lista.length) * 80);
      }

      const blob = await zip.generateAsync({ type: 'blob' });
      this.progresoDescarga = 100;

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `QR_Acceso_${new Date().toISOString().slice(0, 10)}.zip`;
      link.click();
      URL.revokeObjectURL(url);

      this.snackBar.open(
        this.translate.instant('DescargaQr.Snack.Downloaded', { count: lista.length }),
        this.translate.instant('Common.Close'),
        { duration: 3000, panelClass: ['success-snackbar'] }
      );
    } catch {
      this.snackBar.open(
        this.translate.instant('DescargaQr.Snack.ZipError'),
        this.translate.instant('Common.Close'),
        { duration: 4000 }
      );
    } finally {
      this.descargando = false;
      this.progresoDescarga = 0;
    }
  }
}
