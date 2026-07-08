export interface VoluntarioDTO {
  id?: number;
  nombre: string;
  apellido1: string;
  apellido2?: string;
  dni: string;
  telefono?: string;
  email?: string;
  activo?: boolean;
  departamentoIds: number[];
  departamentoNombres?: string[];
  congregacion?: string;
  circuito?: string;
  correoJw?: string;
  formacion?: boolean;
  preAsamblea?: boolean;
}

