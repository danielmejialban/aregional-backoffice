import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CheckInDTO, ScanQrRequest } from '../models/check-in.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class CheckInService {
  private readonly API_URL = `${environment.apiUrl}/api/check-in`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<CheckInDTO[]> {
    return this.http.get<CheckInDTO[]>(this.API_URL);
  }

  getById(id: number): Observable<CheckInDTO> {
    return this.http.get<CheckInDTO>(`${this.API_URL}/${id}`);
  }

  scanQr(request: ScanQrRequest): Observable<CheckInDTO> {
    return this.http.post<CheckInDTO>(`${this.API_URL}/scan`, request);
  }

  create(checkIn: CheckInDTO): Observable<CheckInDTO> {
    return this.http.post<CheckInDTO>(this.API_URL, checkIn);
  }

  update(id: number, checkIn: CheckInDTO): Observable<CheckInDTO> {
    return this.http.put<CheckInDTO>(`${this.API_URL}/${id}`, checkIn);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/${id}`);
  }
}

