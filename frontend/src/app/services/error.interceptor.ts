import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { ToastService } from '../services/toast.service';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const toastService = inject(ToastService);
  const authService = inject(AuthService);
  const router = inject(Router);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      let message = 'An unexpected error occurred';

      if (error.error instanceof ErrorEvent) {
        message = `Error: ${error.error.message}`;
      } else {
        switch (error.status) {
          case 400:
            message = error.error?.error || error.error?.message || 'Invalid request';
            break;
          case 401:
            authService.logout();
            router.navigate(['/login']);
            message = 'Session expired. Please log in again.';
            break;
          case 403:
            message = 'You do not have permission to perform this action';
            break;
          case 404:
            message = 'Resource not found';
            break;
          case 409:
            message = error.error?.error || error.error?.message || 'Conflict';
            break;
          case 422:
            message = error.error?.error || error.error?.message || 'Validation failed';
            break;
          case 500:
            message = 'Internal server error';
            break;
          case 502:
            message = 'Server unavailable';
            break;
          case 503:
            message = 'Service temporarily unavailable';
            break;
          case 0:
            if (error.message.includes('timeout')) {
              message = 'Request timed out';
            } else {
              message = 'Unable to connect to server';
            }
            break;
          default:
            if (error.error?.message) {
              message = error.error.message;
            } else if (error.error?.error) {
              message = error.error.error;
            }
        }
      }

      toastService.error(message);
      return throwError(() => error);
    })
  );
};
