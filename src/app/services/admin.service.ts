import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly API_URL = `${environment.apiUrl}/api/admin`;

  constructor(private http: HttpClient) {}

  limpiarBaseDatos(): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/limpiar-base-datos`);
  }
}
