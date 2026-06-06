import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { forkJoin } from 'rxjs';
import JSZip from 'jszip';
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

  // Datos maestros
  todasAsignaciones: EventoVoluntarioDTO[] = [];
  eventos: EventoDTO[] = [];
  voluntarios: VoluntarioDTO[] = [];
  departamentos: DepartamentoDTO[] = [];

  // Vista previa filtrada
  asignacionesFiltradas: AsignacionConQr[] = [];

  // Estados
  loadingDatos = true;
  descargando = false;
  progresoDescarga = 0;

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
      departamentoId: [null],
      voluntarioId: [null]
    });

    this.form.valueChanges.subscribe(() => this.aplicarFiltros());

    forkJoin({
      asignaciones: this.eventoVoluntarioService.getAll(),
      eventos: this.eventoService.getAll(),
      voluntarios: this.voluntarioService.getAll(),
      departamentos: this.departamentoService.getAll()
    }).subscribe({
      next: ({ asignaciones, eventos, voluntarios, departamentos }) => {
        // Solo asignaciones con QR generado
        this.todasAsignaciones = asignaciones.filter(a => !!a.qrImageBase64);
        this.eventos = eventos;
        this.voluntarios = voluntarios;
        this.departamentos = departamentos;
        this.loadingDatos = false;
        this.aplicarFiltros();
      },
      error: () => {
        this.loadingDatos = false;
        this.snackBar.open(this.translate.instant('DescargaQr.Snack.LoadError'), this.translate.instant('Common.Close'), { duration: 4000 });
      }
    });
  }

  aplicarFiltros(): void {
    const { eventoId, departamentoId, voluntarioId } = this.form.value;

    let resultado = [...this.todasAsignaciones];

    if (eventoId) {
      resultado = resultado.filter(a => a.eventoId === eventoId);
    }

    if (voluntarioId) {
      resultado = resultado.filter(a => a.voluntarioId === voluntarioId);
    }

    if (departamentoId) {
      const voluntariosDelDepto = this.voluntarios
        .filter(v => v.departamentoId === departamentoId)
        .map(v => v.id);
      resultado = resultado.filter(a => voluntariosDelDepto.includes(a.voluntarioId));
    }

    this.asignacionesFiltradas = resultado.map(a => ({ ...a, seleccionada: true }));
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
    this.form.reset();
  }

  getVoluntarioDepartamento(voluntarioId: number): string {
    const v = this.voluntarios.find(vol => vol.id === voluntarioId);
    return v?.departamentoNombre || '—';
  }

  getQrSrc(base64: string): string {
    return `data:image/png;base64,${base64}`;
  }

  private getNombreArchivo(a: EventoVoluntarioDTO): string {
    const vol = (a.voluntarioNombre || 'Voluntario').replace(/\s+/g, '_');
    const ev = (a.eventoNombre || 'Evento').replace(/\s+/g, '_');
    return `QR_${vol}_${ev}.png`;
  }

  descargarIndividual(a: AsignacionConQr): void {
    const link = document.createElement('a');
    link.href = this.getQrSrc(a.qrImageBase64!);
    link.download = this.getNombreArchivo(a);
    link.click();
  }

  descargarPasePdf(a: AsignacionConQr): void {
    const vol = this.voluntarios.find(v => v.id === a.voluntarioId);
    const nombre = vol ? `${vol.nombre}_${vol.apellido1}` : (a.voluntarioNombre || 'pase');
    this.qrPdfService.generarPdf(
      [a],
      this.voluntarios,
      `Pase_${nombre.replace(/\s+/g, '_')}.pdf`
    );
  }

  descargarPasesPdf(): void {
    const lista = this.seleccionadas;
    if (lista.length === 0) return;
    this.qrPdfService.generarPdf(
      lista,
      this.voluntarios,
      `Pases_${new Date().toISOString().slice(0, 10)}.pdf`
    );
  }

  async descargarZip(): Promise<void> {
    const lista = this.seleccionadas;
    if (lista.length === 0) return;

    if (lista.length === 1) {
      this.descargarIndividual(lista[0]);
      return;
    }

    this.descargando = true;
    this.progresoDescarga = 0;

    try {
      const zip = new JSZip();
      const carpeta = zip.folder('QR_Acceso')!;

      for (let i = 0; i < lista.length; i++) {
        const a = lista[i];
        // Convertir base64 a Uint8Array
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

      this.snackBar.open(this.translate.instant('DescargaQr.Snack.Downloaded', { count: lista.length }), this.translate.instant('Common.Close'), {
        duration: 3000, panelClass: ['success-snackbar']
      });
    } catch {
      this.snackBar.open(this.translate.instant('DescargaQr.Snack.ZipError'), this.translate.instant('Common.Close'), { duration: 4000 });
    } finally {
      this.descargando = false;
      this.progresoDescarga = 0;
    }
  }
}

