import { Component, AfterViewInit, OnDestroy, ViewChild, ElementRef, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { CheckInService } from '@app/services/check-in.service';
import { CheckInDTO } from '@app/models/check-in.model';

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
    FormsModule,
    TranslateModule
  ],
  template: `
    <h2 mat-dialog-title>
      <mat-icon style="vertical-align:middle;margin-right:8px">qr_code_scanner</mat-icon>
      {{ 'CheckIn.ScannerDialog.Title' | translate }}
    </h2>

    <mat-dialog-content>
      <!-- Camera view -->
      <div class="scanner-wrapper" *ngIf="!scanResult && !scanError">
        <div *ngIf="loadingCamera" class="camera-loading">
          <mat-spinner diameter="48"></mat-spinner>
          <p>{{ 'CheckIn.ScannerDialog.InitializingCamera' | translate }}</p>
        </div>
        <video #videoElement class="camera-video" [class.hidden]="loadingCamera" autoplay muted playsinline></video>
        <div class="scan-overlay">
          <div class="scan-frame"></div>
          <p class="scan-hint">{{ 'CheckIn.ScannerDialog.CameraInstruction' | translate }}</p>
        </div>
      </div>

      <!-- Observaciones field -->
      <mat-form-field appearance="outline" class="full-width" *ngIf="!scanResult && !scanError">
        <mat-label>{{ 'CheckIn.ScannerDialog.ObservacionesLabel' | translate }}</mat-label>
        <input matInput [(ngModel)]="observaciones" [placeholder]="'CheckIn.ScannerDialog.ObservacionesPlaceholder' | translate">
      </mat-form-field>

      <!-- Processing -->
      <div class="result-container" *ngIf="processing">
        <mat-spinner diameter="48"></mat-spinner>
        <p>{{ 'CheckIn.ScannerDialog.Registering' | translate }}</p>
      </div>

      <!-- Success -->
      <div class="result-container success" *ngIf="scanResult && !processing">
        <mat-icon class="result-icon success-icon">check_circle</mat-icon>
        <h3>{{ 'CheckIn.ScannerDialog.SuccessTitle' | translate }}</h3>
        <p><strong>{{ 'CheckIn.ScannerDialog.VolunteerLabel' | translate }}</strong> {{scanResult.voluntarioNombre}}</p>
        <p><strong>{{ 'CheckIn.ScannerDialog.EventLabel' | translate }}</strong> {{scanResult.eventoNombre}}</p>
        <p><strong>{{ 'CheckIn.ScannerDialog.DateLabel' | translate }}</strong> {{scanResult.fechaCheckIn | date:'dd/MM/yyyy HH:mm'}}</p>
        <p *ngIf="scanResult.matricula"><strong>{{ 'CheckIn.ScannerDialog.MatriculaLabel' | translate }}</strong> {{scanResult.matricula}}</p>
      </div>

      <!-- Warning (acceso fuera de plazo o ya escaneado) -->
      <div class="result-container warning" *ngIf="scanWarning && !processing">
        <mat-icon class="result-icon warning-icon">warning</mat-icon>
        <h3>{{ 'CheckIn.ScannerDialog.WarningTitle' | translate }}</h3>
        <p>{{scanWarning}}</p>
      </div>

      <!-- Error -->
      <div class="result-container error" *ngIf="scanError && !processing">
        <mat-icon class="result-icon error-icon">error</mat-icon>
        <h3>{{ 'CheckIn.ScannerDialog.ErrorTitle' | translate }}</h3>
        <p>{{scanError}}</p>
      </div>

      <!-- Camera error -->
      <div class="result-container error" *ngIf="cameraError">
        <mat-icon class="result-icon error-icon">videocam_off</mat-icon>
        <h3>{{ 'CheckIn.ScannerDialog.CameraErrorTitle' | translate }}</h3>
        <p>{{cameraError}}</p>
      </div>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="close()">{{ 'Common.Close' | translate }}</button>
      <button mat-raised-button color="primary" *ngIf="scanResult || scanError || scanWarning" (click)="reset()">
        <mat-icon>refresh</mat-icon> {{ 'CheckIn.ScannerDialog.ScanAnother' | translate }}
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
    .warning-icon { color: #f57c00; }
    .error-icon { color: #f44336; }
    .result-container.warning { background: #FFF8E1; border-radius: 8px; }
    mat-dialog-content { min-width: 340px; }
  `]
})
export class QrScannerDialogComponent implements AfterViewInit, OnDestroy {
  @ViewChild('videoElement', { static: false }) videoElement!: ElementRef<HTMLVideoElement>;

  loadingCamera = true;
  cameraError: string | null = null;
  processing = false;
  scanResult: CheckInDTO | null = null;
  scanError: string | null = null;
  scanWarning: string | null = null;
  observaciones = '';

  private codeReader: BrowserMultiFormatReader | null = null;
  private scannerControls: any = null;
  private audioCtx: AudioContext | null = null;

  constructor(
    private dialogRef: MatDialogRef<QrScannerDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: QrScannerDialogData,
    private checkInService: CheckInService,
    private translate: TranslateService
  ) {}

  ngAfterViewInit(): void {
    this.startCamera();
  }

  private async startCamera(): Promise<void> {
    const video = this.videoElement?.nativeElement;
    if (!video) {
      this.loadingCamera = false;
      this.cameraError = this.translate.instant('CheckIn.ScannerDialog.CameraErrorNoVideo');
      return;
    }
    this.loadingCamera = true;
    this.cameraError = null;
    this.codeReader = new BrowserMultiFormatReader();

    // Intenta primero con cámara trasera (ideal), si falla prueba cualquier cámara
    const constraints: MediaStreamConstraints[] = [
      { video: { facingMode: { ideal: 'environment' } } },
      { video: true }
    ];

    for (const constraint of constraints) {
      try {
        this.scannerControls = await this.codeReader.decodeFromConstraints(
          constraint,
          video,
          (result) => {
            if (result && !this.processing && !this.scanResult) {
              this.onQrDetected(result.getText());
            }
          }
        );
        this.loadingCamera = false;
        return;
      } catch {
        this.stopCamera();
      }
    }

    // Ambos intentos fallaron
    this.loadingCamera = false;
    const isInsecure = location.protocol !== 'https:' && location.hostname !== 'localhost';
    this.cameraError = isInsecure
      ? this.translate.instant('CheckIn.ScannerDialog.CameraErrorHttps')
      : this.translate.instant('CheckIn.ScannerDialog.CameraErrorPermission');
  }

  private onQrDetected(token: string): void {
    this.processing = true;
    const scanTime = new Date().toISOString();
    this.checkInService.scanQr({ qrToken: token, observaciones: this.observaciones || undefined })
      .subscribe({
        next: (result) => {
          this.processing = false;
          this.scanResult = { ...result, fechaCheckIn: result.fechaCheckIn ?? scanTime };
          this.stopCamera();
          this.playBeep('ok');
        },
        error: (err) => {
          this.processing = false;
          const msg: string = err?.error?.message || this.translate.instant('CheckIn.ScannerDialog.CheckInError');
          if (this.isWarning(msg)) {
            this.scanWarning = msg;
          } else {
            this.scanError = msg;
          }
          this.stopCamera();
          this.playBeep('ko');
        }
      });
  }

  private playBeep(type: 'ok' | 'ko'): void {
    try {
      if (!this.audioCtx) {
        this.audioCtx = new AudioContext();
      }
      const ctx = this.audioCtx;
      const doPlay = () => {
        if (type === 'ok') {
          this.tone(ctx, 1046, 0, 0.18);
        } else {
          this.tone(ctx, 440, 0, 0.15);
          this.tone(ctx, 330, 0.2, 0.15);
        }
      };
      // iOS Safari suspende el AudioContext hasta que hay un gesto del usuario
      if (ctx.state === 'suspended') {
        ctx.resume().then(doPlay).catch(() => {});
      } else {
        doPlay();
      }
    } catch { /* AudioContext not available */ }
  }

  private tone(ctx: AudioContext, frequency: number, delaySeconds: number, duration: number): void {
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime + delaySeconds);
    gain.gain.setValueAtTime(0.6, ctx.currentTime + delaySeconds);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delaySeconds + duration);
    oscillator.start(ctx.currentTime + delaySeconds);
    oscillator.stop(ctx.currentTime + delaySeconds + duration);
  }

  private isWarning(msg: string): boolean {
    return msg.includes('Acceso no permitido') || msg.includes('Ya existe un check-in');
  }

  reset(): void {
    this.stopCamera();
    this.scanResult = null;
    this.scanError = null;
    this.scanWarning = null;
    this.cameraError = null;
    this.observaciones = '';
    this.loadingCamera = true;
    // Esperar a que Angular re-renderice el <video> y, sobre todo,
    // a que iOS Safari libere el hardware de cámara antes de reabrir el stream.
    setTimeout(() => this.startCamera(), 300);
  }

  private stopCamera(): void {
    if (this.scannerControls) {
      this.scannerControls.stop();
      this.scannerControls = null;
    }
    // iOS Safari no libera el hardware de cámara con scannerControls.stop() solo;
    // hay que parar explícitamente todas las pistas del MediaStream y limpiar srcObject.
    const video = this.videoElement?.nativeElement;
    if (video?.srcObject) {
      (video.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      video.srcObject = null;
    }
  }

  close(): void {
    this.stopCamera();
    this.dialogRef.close(this.scanResult);
  }

  ngOnDestroy(): void {
    this.stopCamera();
    this.audioCtx?.close();
  }
}

