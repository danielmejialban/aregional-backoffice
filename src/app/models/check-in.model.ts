export interface CheckInDTO {
  id?: number;
  fechaHora?: string;
  observaciones?: string;
  eventoVoluntarioId?: number;
  voluntarioId?: number;
  eventoId?: number;
  voluntarioNombre?: string;
  eventoNombre?: string;
}

export interface ScanQrRequest {
  qrToken: string;
  observaciones?: string;
}

