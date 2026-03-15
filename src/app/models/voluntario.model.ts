export interface VoluntarioDTO {
  id?: number;
  nombre: string;
  apellido1: string;
  apellido2?: string;
  dni: string;
  telefono?: string;
  email?: string;
  direccion?: string;
  fechaNacimiento?: string;
  departamentoId: number;
  departamentoNombre?: string;
}

