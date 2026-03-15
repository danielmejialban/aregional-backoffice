import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { VoluntarioDTO } from '../models/voluntario.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class VoluntarioService {
  private readonly API_URL = `${environment.apiUrl}/api/voluntarios`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<VoluntarioDTO[]> {
    return this.http.get<VoluntarioDTO[]>(this.API_URL);
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
}

