export interface EventoVoluntarioDTO {
  id?: number;
  voluntarioId: number;
  voluntarioNombre?: string;
  eventoId: number;
  eventoNombre?: string;
  qrToken?: string;
  qrImageBase64?: string;
}

export interface AsignacionMasivaRequestDTO {
  eventoId: number;
  departamentoId: number;
  generarQr?: boolean;
}

export interface AsignacionMasivaDetalleDTO {
  voluntarioId: number;
  nombreCompleto: string;
  dni: string;
  estado: 'CREADO' | 'OMITIDO' | 'ERROR';
  mensaje: string;
}

export interface AsignacionMasivaResultadoDTO {
  totalVoluntarios: number;
  asignacionesCreadas: number;
  omitidas: number;
  errores: number;
  detalle: AsignacionMasivaDetalleDTO[];
}

