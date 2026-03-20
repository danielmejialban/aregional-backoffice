import { Component, OnInit, OnDestroy, ViewChild, ElementRef, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { CheckInService } from '../../services/check-in.service';
import { CheckInDTO } from '../../models/check-in.model';

export interface QrScannerDialogData {
  eventoId?: number;
}

@Component({
  selector: 'app-qr-scanner-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatFormFieldModule,
    MatInputModule,
    FormsModule
  ],
  template: `
    <h2 mat-dialog-title>
      <mat-icon style="vertical-align:middle;margin-right:8px">qr_code_scanner</mat-icon>
      Escanear QR de Voluntario
    </h2>

    <mat-dialog-content>
      <!-- Camera view -->
      <div class="scanner-wrapper" *ngIf="!scanResult && !scanError">
        <div *ngIf="loadingCamera" class="camera-loading">
          <mat-spinner diameter="48"></mat-spinner>
          <p>Iniciando cámara...</p>
        </div>
        <video #videoElement class="camera-video" [class.hidden]="loadingCamera" autoplay muted playsinline></video>
        <div class="scan-overlay">
          <div class="scan-frame"></div>
          <p class="scan-hint">Apunta la cámara al código QR del voluntario</p>
        </div>
      </div>

      <!-- Observaciones field -->
      <mat-form-field appearance="outline" class="full-width" *ngIf="!scanResult && !scanError">
        <mat-label>Observaciones (opcional)</mat-label>
        <input matInput [(ngModel)]="observaciones" placeholder="Notas adicionales...">
      </mat-form-field>

      <!-- Processing -->
      <div class="result-container" *ngIf="processing">
        <mat-spinner diameter="48"></mat-spinner>
        <p>Registrando check-in...</p>
      </div>

      <!-- Success -->
      <div class="result-container success" *ngIf="scanResult && !processing">
        <mat-icon class="result-icon success-icon">check_circle</mat-icon>
        <h3>¡Check-In Registrado!</h3>
        <p><strong>Voluntario:</strong> {{scanResult.voluntarioNombre}}</p>
        <p><strong>Evento:</strong> {{scanResult.eventoNombre}}</p>
        <p><strong>Fecha:</strong> {{scanResult.fechaHora | date:'dd/MM/yyyy HH:mm'}}</p>
      </div>

      <!-- Error -->
      <div class="result-container error" *ngIf="scanError && !processing">
        <mat-icon class="result-icon error-icon">error</mat-icon>
        <h3>Error al registrar</h3>
        <p>{{scanError}}</p>
      </div>

      <!-- Camera error -->
      <div class="result-container error" *ngIf="cameraError">
        <mat-icon class="result-icon error-icon">videocam_off</mat-icon>
        <h3>Sin acceso a la cámara</h3>
        <p>{{cameraError}}</p>
      </div>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="close()">Cerrar</button>
      <button mat-raised-button color="primary" *ngIf="scanResult || scanError" (click)="reset()">
        <mat-icon>refresh</mat-icon> Escanear otro
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .scanner-wrapper { position: relative; width: 100%; max-width: 400px; margin: 0 auto; }
    .camera-video { width: 100%; border-radius: 8px; display: block; max-height: 300px; object-fit: cover; }
    .camera-video.hidden { display: none; }
    .camera-loading { display: flex; flex-direction: column; align-items: center; padding: 40px; gap: 16px; }
    .scan-overlay { position: absolute; top: 0; left: 0; right: 0; bottom: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; pointer-events: none; }
    .scan-frame { width: 200px; height: 200px; border: 3px solid #1976d2; border-radius: 12px; box-shadow: 0 0 0 9999px rgba(0,0,0,0.3); }
    .scan-hint { color: white; margin-top: 12px; font-size: 13px; text-shadow: 0 1px 3px rgba(0,0,0,0.8); }
    .full-width { width: 100%; margin-top: 16px; }
    .result-container { display: flex; flex-direction: column; align-items: center; padding: 24px; gap: 8px; text-align: center; }
    .result-icon { font-size: 64px; width: 64px; height: 64px; }
    .success-icon { color: #4caf50; }
    .error-icon { color: #f44336; }
    mat-dialog-content { min-width: 340px; }
  `]
})
export class QrScannerDialogComponent implements OnInit, OnDestroy {
  @ViewChild('videoElement', { static: false }) videoElement!: ElementRef<HTMLVideoElement>;

  loadingCamera = true;
  cameraError: string | null = null;
  processing = false;
  scanResult: CheckInDTO | null = null;
  scanError: string | null = null;
  observaciones = '';

  private codeReader = new BrowserMultiFormatReader();
  private scannerControls: any = null;

  constructor(
    private dialogRef: MatDialogRef<QrScannerDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: QrScannerDialogData,
    private checkInService: CheckInService
  ) {}

  ngOnInit(): void {
    setTimeout(() => this.startCamera(), 300);
  }

  private async startCamera(): Promise<void> {
    try {
      const video = this.videoElement?.nativeElement;
      if (!video) return;
      this.loadingCamera = true;
      this.scannerControls = await this.codeReader.decodeFromConstraints(
        { video: { facingMode: 'environment' } },
        video,
        (result, err) => {
          if (result && !this.processing && !this.scanResult) {
            this.onQrDetected(result.getText());
          }
        }
      );
      this.loadingCamera = false;
    } catch (err: any) {
      this.loadingCamera = false;
      this.cameraError = 'No se pudo acceder a la cámara. Verifica los permisos del navegador.';
    }
  }

  private onQrDetected(token: string): void {
    this.processing = true;
    this.checkInService.scanQr({ qrToken: token, observaciones: this.observaciones || undefined })
      .subscribe({
        next: (result) => { this.processing = false; this.scanResult = result; this.stopCamera(); },
        error: (err) => {
          this.processing = false;
          this.scanError = err?.error?.message || 'No se pudo registrar el check-in. Intenta de nuevo.';
          this.stopCamera();
        }
      });
  }

  reset(): void {
    this.scanResult = null;
    this.scanError = null;
    this.cameraError = null;
    this.observaciones = '';
    this.loadingCamera = true;
    setTimeout(() => this.startCamera(), 300);
  }

  private stopCamera(): void {
    if (this.scannerControls) {
      this.scannerControls.stop();
      this.scannerControls = null;
    }
  }

  close(): void {
    this.stopCamera();
    this.dialogRef.close(this.scanResult);
  }

  ngOnDestroy(): void {
    this.stopCamera();
  }
}

