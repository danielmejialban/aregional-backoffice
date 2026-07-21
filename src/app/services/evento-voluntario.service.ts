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
  departamentoId?: number | null;
  matricula?: string;
  /** Entradas con formato `yyyy-MM-dd:SI` o `yyyy-MM-dd:NO`. */
  accesoDias?: string[];
}

@Injectable({
  providedIn: 'root'
})
export class EventoVoluntarioService {
  private readonly API_URL = `${environment.apiUrl}/api/evento-voluntarios`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<EventoVoluntarioDTO[]> {
    const params = new HttpParams().set('size', '5000');
    return this.http.get<EventoVoluntarioDTO[] | PageDTO<EventoVoluntarioDTO>>(this.API_URL, { params }).pipe(
      map(r => Array.isArray(r) ? r : (r.content ?? []))
    );
  }

  getAllPaged(page: number, size: number, filtros?: AsignacionFiltros): Observable<PageDTO<EventoVoluntarioDTO>> {
    let params = new HttpParams().set('page', page).set('size', size);
    if (filtros?.busqueda?.trim())    params = params.set('busqueda', filtros.busqueda.trim());
    if (filtros?.departamentoId != null) params = params.set('departamentoId', filtros.departamentoId);
    if (filtros?.matricula?.trim())   params = params.set('matricula', filtros.matricula.trim());
    filtros?.accesoDias?.forEach(f => params = params.append('accesoDia', f));

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

  /**
   * `includeQrImage=false` devuelve solo el qrToken (sin PNG Base64): imprescindible
   * para listados masivos donde la imagen se genera en el cliente.
   */
  getByEvento(eventoId: number, filtros?: Omit<AsignacionFiltros, 'eventoId'>, includeQrImage = true): Observable<EventoVoluntarioDTO[]> {
    let params = new HttpParams().set('size', '5000');
    if (filtros?.busqueda?.trim())       params = params.set('busqueda', filtros.busqueda.trim());
    if (filtros?.departamentoId != null) params = params.set('departamentoId', filtros.departamentoId);
    if (filtros?.matricula?.trim())      params = params.set('matricula', filtros.matricula.trim());
    filtros?.accesoDias?.forEach(f => params = params.append('accesoDia', f));
    if (!includeQrImage) params = params.set('includeQrImage', 'false');
    return this.http.get<EventoVoluntarioDTO[] | PageDTO<EventoVoluntarioDTO>>(
      `${this.API_URL}/evento/${eventoId}`, { params }
    ).pipe(map(r => Array.isArray(r) ? r : (r.content ?? [])));
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

  updateDiasAcceso(id: number, diasAcceso: string[]): Observable<EventoVoluntarioDTO> {
    return this.http.patch<EventoVoluntarioDTO>(`${this.API_URL}/${id}/dias-acceso`, diasAcceso);
  }
}
