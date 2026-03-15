export interface EventoVoluntarioDTO {
  id?: number;
  voluntarioId: number;
  voluntarioNombre?: string;
  eventoId: number;
  eventoNombre?: string;
  qrToken?: string;
  qrImageBase64?: string;
}

