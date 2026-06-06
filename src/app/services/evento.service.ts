import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { EventoDTO } from '../models/evento.model';
import { PageDTO } from '../models/page.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class EventoService {
  private readonly API_URL = `${environment.apiUrl}/api/eventos`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<EventoDTO[]> {
    return this.http.get<EventoDTO[] | PageDTO<EventoDTO>>(this.API_URL).pipe(
      map(r => Array.isArray(r) ? r : (r.content ?? []))
    );
  }

  getAllPaged(page: number, size: number): Observable<PageDTO<EventoDTO>> {
    const params = new HttpParams().set('page', page).set('size', size);
    return this.http.get<PageDTO<EventoDTO>>(this.API_URL, { params });
  }

  getById(id: number): Observable<EventoDTO> {
    return this.http.get<EventoDTO>(`${this.API_URL}/${id}`);
  }

  create(evento: EventoDTO): Observable<EventoDTO> {
    return this.http.post<EventoDTO>(this.API_URL, evento);
  }

  update(id: number, evento: EventoDTO): Observable<EventoDTO> {
    return this.http.put<EventoDTO>(`${this.API_URL}/${id}`, evento);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/${id}`);
  }

  getByTipo(tipoEvento: string): Observable<EventoDTO[]> {
    return this.http.get<EventoDTO[]>(`${this.API_URL}/tipo/${tipoEvento}`);
  }

  getConvocatoriaActiva(): Observable<EventoDTO[]> {
    return this.http.get<EventoDTO[]>(`${this.API_URL}/convocatoria-activa`);
  }
}

