import { Injectable, inject, signal } from '@angular/core';
import { OverlayContainer } from '@angular/cdk/overlay';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private overlayContainer = inject(OverlayContainer);
  private _isDark = signal(false);
  readonly isDark = this._isDark.asReadonly();

  constructor() {
    const prefersDark = localStorage.getItem('theme') === 'dark';
    this.applyTheme(prefersDark);
  }

  toggleDarkMode(): void {
    this.applyTheme(!this._isDark());
  }

  private applyTheme(isDark: boolean): void {
    this._isDark.set(isDark);
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    document.body.classList.toggle('dark-theme', isDark);
    this.overlayContainer.getContainerElement().classList.toggle('dark-theme', isDark);
  }
}
