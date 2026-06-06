import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslateService } from '@ngx-translate/core';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const snackBar = inject(MatSnackBar);
  const translate = inject(TranslateService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      let errorMessage = translate.instant('Errors.Default');

      if (error.error instanceof ErrorEvent || error.status === 0) {
        errorMessage = translate.instant('Errors.Network');
      } else {
        switch (error.status) {
          case 401:
            errorMessage = translate.instant('Errors.Unauthorized');
            localStorage.removeItem('auth_token');
            localStorage.removeItem('current_user');
            router.navigate(['/login']);
            break;
          case 403:
            errorMessage = translate.instant('Errors.Forbidden');
            break;
          case 404:
            errorMessage = translate.instant('Errors.NotFound');
            break;
          case 409:
            errorMessage = error.error?.message || translate.instant('Errors.Conflict');
            break;
          case 422:
            errorMessage = error.error?.message || translate.instant('Errors.Unprocessable');
            break;
          case 500:
          case 502:
          case 503:
            errorMessage = translate.instant('Errors.ServerUnavailable');
            break;
          default:
            errorMessage = translate.instant('Errors.Unknown');
        }
      }

      snackBar.open(errorMessage, translate.instant('Common.Close'), {
        duration: 5000,
        horizontalPosition: 'center',
        verticalPosition: 'bottom',
        panelClass: ['error-snackbar']
      });

      return throwError(() => error);
    })
  );
};
