import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AuthService } from '@app/services/auth.service';
import { environment } from '../../../environments/environment';

declare const hcaptcha: any;

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatIconModule,
    TranslateModule
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit, OnDestroy {
  loginForm: FormGroup;
  loading = false;
  hidePassword = true;
  readonly captchaEnabled = environment.captchaEnabled;
  private captchaToken: string | null = null;
  private widgetId: string | null = null;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private snackBar: MatSnackBar,
    private translate: TranslateService
  ) {
    this.loginForm = this.fb.group({
      dni: ['', [Validators.required]],
      contrasena: ['', [Validators.required]]
    });
  }

  ngOnInit(): void {
    if (this.captchaEnabled) {
      this.loadHcaptchaScript();
    }
  }

  ngOnDestroy(): void {
    if (this.widgetId !== null && typeof hcaptcha !== 'undefined') {
      hcaptcha.reset(this.widgetId);
    }
  }

  private loadHcaptchaScript(): void {
    if (document.getElementById('hcaptcha-script')) {
      this.renderCaptcha();
      return;
    }
    const script = document.createElement('script');
    script.id = 'hcaptcha-script';
    script.src = 'https://js.hcaptcha.com/1/api.js?render=explicit';
    script.async = true;
    script.defer = true;
    script.onload = () => this.renderCaptcha();
    document.head.appendChild(script);
  }

  private renderCaptcha(): void {
    setTimeout(() => {
      if (typeof hcaptcha !== 'undefined') {
        this.widgetId = hcaptcha.render('hcaptcha-widget', {
          sitekey: environment.hcaptchaSiteKey,
          callback: (token: string) => { this.captchaToken = token; },
          'expired-callback': () => { this.captchaToken = null; },
          'error-callback': () => { this.captchaToken = null; }
        });
      }
    }, 100);
  }

  onSubmit(): void {
    if (this.loginForm.invalid) return;
    if (this.captchaEnabled && !this.captchaToken) {
      this.snackBar.open(
        this.translate.instant('Login.CaptchaRequired') || 'Por favor completa el captcha',
        this.translate.instant('Common.Close'),
        { duration: 3000 }
      );
      return;
    }

    this.loading = true;
    const payload = {
      ...this.loginForm.value,
      ...(this.captchaEnabled && this.captchaToken ? { captchaToken: this.captchaToken } : {})
    };

    this.authService.login(payload).subscribe({
      next: () => {
        this.snackBar.open(this.translate.instant('Login.Welcome'), this.translate.instant('Common.Close'), {
          duration: 3000,
          horizontalPosition: 'center',
          verticalPosition: 'bottom',
          panelClass: ['success-snackbar']
        });
        this.router.navigate(['/']);
      },
      error: (error) => {
        this.loading = false;
        if (this.captchaEnabled && typeof hcaptcha !== 'undefined' && this.widgetId !== null) {
          hcaptcha.reset(this.widgetId);
          this.captchaToken = null;
        }
        console.error('Error de login:', error);
      }
    });
  }
}
