export interface FormacionDTO {
  id?: number;
  eventoId: number;
  eventoNombre?: string;
  voluntarioId: number;
  voluntarioDni?: string;
  voluntarioNombre?: string;
  asistio?: boolean;
  aprobada?: boolean;
}
