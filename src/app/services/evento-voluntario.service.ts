import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { EventoVoluntarioDTO } from '../models/evento-voluntario.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class EventoVoluntarioService {
  private readonly API_URL = `${environment.apiUrl}/api/evento-voluntarios`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<EventoVoluntarioDTO[]> {
    return this.http.get<EventoVoluntarioDTO[]>(this.API_URL);
  }

  getById(id: number): Observable<EventoVoluntarioDTO> {
    return this.http.get<EventoVoluntarioDTO>(`${this.API_URL}/${id}`);
  }

  create(eventoVoluntario: EventoVoluntarioDTO): Observable<EventoVoluntarioDTO> {
    return this.http.post<EventoVoluntarioDTO>(this.API_URL, eventoVoluntario);
  }

  update(id: number, eventoVoluntario: EventoVoluntarioDTO): Observable<EventoVoluntarioDTO> {
    return this.http.put<EventoVoluntarioDTO>(`${this.API_URL}/${id}`, eventoVoluntario);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/${id}`);
  }
}

