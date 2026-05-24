import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { FormacionDTO } from '../models/formacion.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class FormacionService {
  private readonly API_URL = `${environment.apiUrl}/api/formaciones`;

  constructor(private http: HttpClient) {}

  getByEvento(eventoId: number): Observable<FormacionDTO[]> {
    const params = new HttpParams().set('eventoId', String(eventoId));
    return this.http.get<FormacionDTO[]>(this.API_URL, { params });
  }

  getByVoluntario(voluntarioId: number): Observable<FormacionDTO[]> {
    return this.http.get<FormacionDTO[]>(`${this.API_URL}/voluntario/${voluntarioId}`);
  }

  getById(id: number): Observable<FormacionDTO> {
    return this.http.get<FormacionDTO>(`${this.API_URL}/${id}`);
  }

  registrar(eventoId: number, voluntarioId: number): Observable<FormacionDTO> {
    return this.http.post<FormacionDTO>(this.API_URL, { eventoId, voluntarioId });
  }

  actualizarAprobada(id: number, aprobada: boolean): Observable<FormacionDTO> {
    return this.http.patch<FormacionDTO>(`${this.API_URL}/${id}/aprobada`, { aprobada });
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/${id}`);
  }
}
