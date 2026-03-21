import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { EventoVoluntarioDTO } from '../../../models/evento-voluntario.model';

export interface QrPreviewDialogData {
  asignacion: EventoVoluntarioDTO;
}

@Component({
  selector: 'app-qr-preview-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  templateUrl: './qr-preview-dialog.component.html',
  styleUrls: ['./qr-preview-dialog.component.scss']
})
export class QrPreviewDialogComponent {
  asignacion: EventoVoluntarioDTO;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: QrPreviewDialogData,
    private dialogRef: MatDialogRef<QrPreviewDialogComponent>
  ) {
    this.asignacion = data.asignacion;
  }

  get qrSrc(): string {
    return `data:image/png;base64,${this.asignacion.qrImageBase64}`;
  }

  descargar(): void {
    const vol = (this.asignacion.voluntarioNombre || 'Voluntario').replace(/\s+/g, '_');
    const ev = (this.asignacion.eventoNombre || 'Evento').replace(/\s+/g, '_');
    const link = document.createElement('a');
    link.href = this.qrSrc;
    link.download = `QR_${vol}_${ev}.png`;
    link.click();
  }

  cerrar(): void {
    this.dialogRef.close();
  }
}

