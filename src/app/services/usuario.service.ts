import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { UsuarioDTO } from '../models/usuario.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class UsuarioService {
  private readonly API_URL = `${environment.apiUrl}/api/usuarios`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<UsuarioDTO[]> {
    return this.http.get<UsuarioDTO[]>(this.API_URL);
  }

  getById(id: number): Observable<UsuarioDTO> {
    return this.http.get<UsuarioDTO>(`${this.API_URL}/${id}`);
  }

  create(usuario: UsuarioDTO): Observable<UsuarioDTO> {
    return this.http.post<UsuarioDTO>(this.API_URL, usuario);
  }

  update(id: number, usuario: UsuarioDTO): Observable<UsuarioDTO> {
    return this.http.put<UsuarioDTO>(`${this.API_URL}/${id}`, usuario);
  }

  cambiarRol(id: number, rolId: number): Observable<UsuarioDTO> {
    return this.http.patch<UsuarioDTO>(`${this.API_URL}/${id}/rol`, { rolId });
  }

  cambiarContrasena(id: number, contrasena: string): Observable<UsuarioDTO> {
    return this.http.patch<UsuarioDTO>(`${this.API_URL}/${id}/contrasena`, { contrasena });
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/${id}`);
  }
}

