import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { RolDTO } from '../models/rol.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class RolService {
  private readonly API_URL = `${environment.apiUrl}/api/roles`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<RolDTO[]> {
    return this.http.get<RolDTO[]>(this.API_URL);
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

