import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { AsignacionMasivaRequestDTO, AsignacionMasivaResultadoDTO, EventoVoluntarioDTO } from '../models/evento-voluntario.model';
import { PageDTO } from '../models/page.model';
import { environment } from '../../environments/environment';

export interface AsignacionFiltros {
  busqueda?: string;
  eventoId?: number | null;
}

@Injectable({
  providedIn: 'root'
})
export class EventoVoluntarioService {
  private readonly API_URL = `${environment.apiUrl}/api/evento-voluntarios`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<EventoVoluntarioDTO[]> {
    return this.http.get<EventoVoluntarioDTO[] | PageDTO<EventoVoluntarioDTO>>(this.API_URL).pipe(
      map(r => Array.isArray(r) ? r : (r.content ?? []))
    );
  }

  getAllPaged(page: number, size: number, filtros?: AsignacionFiltros): Observable<PageDTO<EventoVoluntarioDTO>> {
    let params = new HttpParams().set('page', page).set('size', size);
    if (filtros?.busqueda?.trim()) params = params.set('busqueda', filtros.busqueda.trim());

    if (filtros?.eventoId != null) {
      return this.http.get<PageDTO<EventoVoluntarioDTO>>(
        `${this.API_URL}/evento/${filtros.eventoId}`, { params }
      );
    }

    return this.http.get<PageDTO<EventoVoluntarioDTO>>(this.API_URL, { params });
  }

  getByVoluntario(voluntarioId: number): Observable<EventoVoluntarioDTO[]> {
    return this.http.get<EventoVoluntarioDTO[]>(`${this.API_URL}/voluntario/${voluntarioId}`);
  }

  getByEvento(eventoId: number): Observable<EventoVoluntarioDTO[]> {
    return this.http.get<EventoVoluntarioDTO[]>(`${this.API_URL}/evento/${eventoId}`);
  }

  getById(id: number): Observable<EventoVoluntarioDTO> {
    return this.http.get<EventoVoluntarioDTO>(`${this.API_URL}/${id}`);
  }

  getQrImage(id: number): Observable<Blob> {
    return this.http.post(`${this.API_URL}/${id}/qr`, {}, { responseType: 'blob' });
  }

  create(eventoVoluntario: EventoVoluntarioDTO): Observable<EventoVoluntarioDTO> {
    return this.http.post<EventoVoluntarioDTO>(this.API_URL, eventoVoluntario);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/${id}`);
  }

  asignacionMasiva(request: AsignacionMasivaRequestDTO): Observable<AsignacionMasivaResultadoDTO> {
    return this.http.post<AsignacionMasivaResultadoDTO>(`${this.API_URL}/asignacion-masiva`, request);
  }
}
