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
  dniTemporal?: boolean;
  dniInvalid?: boolean;
  /** Funcionalidades especiales (p.ej. trabajo en altura). Solo aplica a voluntarios del departamento LBD. */
  specialFunctionalities?: boolean;
}

