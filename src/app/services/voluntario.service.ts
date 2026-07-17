import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { VoluntarioDTO } from '../models/voluntario.model';
import { CargaMasivaResultadoDTO } from '../models/carga-masiva-resultado.model';
import { PageDTO } from '../models/page.model';
import { environment } from '../../environments/environment';

export interface VoluntarioFiltros {
  busqueda?: string;
  email?: string;
  departamentoId?: number | null;
  activo?: boolean | null;
  formacion?: boolean | null;
  congregacion?: string;
  circuito?: string;
}

@Injectable({
  providedIn: 'root'
})
export class VoluntarioService {
  private readonly API_URL = `${environment.apiUrl}/api/voluntarios`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<VoluntarioDTO[]> {
    const params = new HttpParams().set('size', '10000');
    return this.http.get<VoluntarioDTO[] | PageDTO<VoluntarioDTO>>(this.API_URL, { params }).pipe(
      map(r => Array.isArray(r) ? r : (r.content ?? []))
    );
  }

  getAllPaged(page: number, size: number, filtros?: VoluntarioFiltros): Observable<PageDTO<VoluntarioDTO>> {
    let params = new HttpParams().set('page', page).set('size', size);
    if (filtros?.busqueda?.trim())      params = params.set('busqueda', filtros.busqueda.trim());
    if (filtros?.email?.trim())         params = params.set('email', filtros.email.trim());
    if (filtros?.activo != null)        params = params.set('activo', filtros.activo);
    if (filtros?.formacion != null)     params = params.set('formacion', filtros.formacion);
    if (filtros?.congregacion?.trim())  params = params.set('congregacion', filtros.congregacion.trim());
    if (filtros?.circuito?.trim())      params = params.set('circuito', filtros.circuito.trim());

    if (filtros?.departamentoId != null) {
      return this.http.get<PageDTO<VoluntarioDTO>>(
        `${this.API_URL}/departamento/${filtros.departamentoId}`, { params }
      );
    }

    return this.http.get<PageDTO<VoluntarioDTO>>(this.API_URL, { params });
  }

  getById(id: number): Observable<VoluntarioDTO> {
    return this.http.get<VoluntarioDTO>(`${this.API_URL}/${id}`);
  }

  create(voluntario: VoluntarioDTO): Observable<VoluntarioDTO> {
    return this.http.post<VoluntarioDTO>(this.API_URL, voluntario);
  }

  update(id: number, voluntario: VoluntarioDTO): Observable<VoluntarioDTO> {
    return this.http.put<VoluntarioDTO>(`${this.API_URL}/${id}`, voluntario);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/${id}`);
  }

  activar(id: number): Observable<VoluntarioDTO> {
    return this.http.patch<VoluntarioDTO>(`${this.API_URL}/${id}/activar`, {});
  }

  desactivar(id: number): Observable<VoluntarioDTO> {
    return this.http.patch<VoluntarioDTO>(`${this.API_URL}/${id}/desactivar`, {});
  }

  uploadCsv(archivo: File): Observable<CargaMasivaResultadoDTO> {
    return this.uploadMasivo(archivo);
  }

  uploadMasivo(archivo: File): Observable<CargaMasivaResultadoDTO> {
    const formData = new FormData();
    formData.append('archivo', archivo);
    return this.http.post<CargaMasivaResultadoDTO>(`${this.API_URL}/carga-masiva`, formData);
  }
}
