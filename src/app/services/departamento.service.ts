import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { DepartamentoDTO } from '../models/departamento.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class DepartamentoService {
  private readonly API_URL = `${environment.apiUrl}/api/departamentos`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<DepartamentoDTO[]> {
    return this.http.get<DepartamentoDTO[]>(this.API_URL);
  }

  getById(id: number): Observable<DepartamentoDTO> {
    return this.http.get<DepartamentoDTO>(`${this.API_URL}/${id}`);
  }

  create(departamento: DepartamentoDTO): Observable<DepartamentoDTO> {
    return this.http.post<DepartamentoDTO>(this.API_URL, departamento);
  }

  update(id: number, departamento: DepartamentoDTO): Observable<DepartamentoDTO> {
    return this.http.put<DepartamentoDTO>(`${this.API_URL}/${id}`, departamento);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/${id}`);
  }
}

