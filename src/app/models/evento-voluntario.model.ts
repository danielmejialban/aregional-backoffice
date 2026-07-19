export interface EventoVoluntarioDTO {
  id?: number;
  voluntarioId: number;
  voluntarioNombre?: string;
  voluntarioDepartamentoNombre?: string;
  eventoId: number;
  eventoNombre?: string;
  fechaInicioEvento?: string;
  fechaFinEvento?: string;
  /** Fechas de acceso permitidas separadas por "|". null = acceso total al evento */
  diasAcceso?: string;
  /** Matrícula de vehículo para esta asignación (opcional) */
  matricula?: string;
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

