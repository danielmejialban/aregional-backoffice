import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

export interface ConfirmDialogData {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmColor?: 'primary' | 'accent' | 'warn';
  icon?: string;
}

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <div class="confirm-dialog-container">
      <div class="confirm-dialog-header" [class]="'header-' + (data.confirmColor ?? 'warn')">
        <mat-icon class="confirm-icon" *ngIf="data.icon">{{ data.icon }}</mat-icon>
      </div>

      <h2 mat-dialog-title class="confirm-title">{{ data.title }}</h2>

      <mat-dialog-content>
        <p class="confirm-message">{{ data.message }}</p>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-stroked-button (click)="dialogRef.close(false)">
          {{ data.cancelText ?? 'Cancelar' }}
        </button>
        <button
          mat-raised-button
          [color]="data.confirmColor ?? 'warn'"
          (click)="dialogRef.close(true)"
        >
          <mat-icon *ngIf="data.icon">{{ data.icon }}</mat-icon>
          {{ data.confirmText ?? 'Confirmar' }}
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .confirm-dialog-container { min-width: 340px; }

    .confirm-dialog-header {
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 24px 0 8px;
    }

    .confirm-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
    }

    .header-warn .confirm-icon { color: #ef4444; }
    .header-primary .confirm-icon { color: #3b82f6; }
    .header-accent .confirm-icon { color: #f59e0b; }

    .confirm-title {
      text-align: center;
      font-size: 18px;
      font-weight: 700;
      padding: 0 24px;
      margin-bottom: 4px;
    }

    .confirm-message {
      color: #475569;
      font-size: 14px;
      line-height: 1.6;
      text-align: center;
      margin: 0;
    }

    mat-dialog-actions {
      padding: 16px 24px 20px;
      gap: 12px;
    }
  `]
})
export class ConfirmDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<ConfirmDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ConfirmDialogData
  ) {}
}
