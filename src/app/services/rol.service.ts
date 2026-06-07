import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { RolDTO } from '../models/rol.model';
import { PageDTO } from '../models/page.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class RolService {
  private readonly API_URL = `${environment.apiUrl}/api/roles`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<RolDTO[]> {
    return this.http.get<RolDTO[] | PageDTO<RolDTO>>(this.API_URL).pipe(
      map(resp => Array.isArray(resp) ? resp : resp.content ?? [])
    );
  }

  getAllPaged(page: number, size: number, nombre?: string): Observable<PageDTO<RolDTO>> {
    let params = new HttpParams().set('page', page).set('size', size);
    if (nombre?.trim()) params = params.set('nombre', nombre.trim());
    return this.http.get<PageDTO<RolDTO>>(this.API_URL, { params });
  }

  getById(id: number): Observable<RolDTO> {
    return this.http.get<RolDTO>(`${this.API_URL}/${id}`);
  }

  create(rol: RolDTO): Observable<RolDTO> {
    return this.http.post<RolDTO>(this.API_URL, rol);
  }

  update(id: number, rol: RolDTO): Observable<RolDTO> {
    return this.http.put<RolDTO>(`${this.API_URL}/${id}`, rol);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/${id}`);
  }
}
