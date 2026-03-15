import { VoluntarioDTO } from './voluntario.model';

export interface LoginRequest {
  dni: string;
  contrasena: string;
}

export interface LoginResponse {
  token: string;
  tipo: string;
  usuarioId: number;
  nombreUsuario: string;
  rol: string;
  voluntario?: VoluntarioDTO;
}

