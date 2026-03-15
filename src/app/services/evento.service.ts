import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { EventoDTO } from '../models/evento.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class EventoService {
  private readonly API_URL = `${environment.apiUrl}/api/eventos`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<EventoDTO[]> {
    return this.http.get<EventoDTO[]>(this.API_URL);
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
}

