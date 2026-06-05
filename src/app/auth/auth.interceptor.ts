import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from './auth.service';

const ACCESS_TOKEN_KEY = 'fifabet.accessToken';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
  const isAuthRequest = req.url.includes('/api/v1/auth/');

  const request = accessToken && !isAuthRequest
    ? req.clone({
        setHeaders: {
          Authorization: `Bearer ${accessToken}`,
        },
      })
    : req;

  return next(request).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse) || error.status !== 401 || isAuthRequest) {
        return throwError(() => error);
      }

      return authService.refresh().pipe(
        switchMap((response) =>
          next(
            req.clone({
              setHeaders: {
                Authorization: `Bearer ${response.accessToken}`,
              },
            })
          )
        ),
        catchError((refreshError: unknown) => {
          authService.clearAuth();
          window.history.replaceState({}, '', '/login');
          window.dispatchEvent(new PopStateEvent('popstate'));
          return throwError(() => refreshError);
        })
      );
    })
  );
};
