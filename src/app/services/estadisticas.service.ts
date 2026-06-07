import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { EstadisticasResumenDTO } from '../models/estadisticas.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class EstadisticasService {
  private readonly API_URL = `${environment.apiUrl}/api/estadisticas`;

  constructor(private http: HttpClient) {}

  getResumen(): Observable<EstadisticasResumenDTO> {
    return this.http.get<EstadisticasResumenDTO>(`${this.API_URL}/resumen`);
  }
}
