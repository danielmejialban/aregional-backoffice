export interface CheckInDTO {
  id?: number;
  fechaCheckIn?: string;
  fechaCheckOut?: string;
  estado?: string;
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
