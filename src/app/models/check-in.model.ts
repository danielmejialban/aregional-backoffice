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
  /** Matrícula de vehículo de la asignación (null/ausente si no informada) */
  matricula?: string;
}

export interface ScanQrRequest {
  qrToken: string;
  observaciones?: string;
}
