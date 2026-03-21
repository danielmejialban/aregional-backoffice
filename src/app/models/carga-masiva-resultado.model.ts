export interface FilaResultadoDTO {
  fila: number;
  estado: 'CREADO' | 'OMITIDO' | 'ERROR';
  dni: string | null;
  mensaje: string;
}

export interface CargaMasivaResultadoDTO {
  totalFilas: number;
  creados: number;
  omitidos: number;
  errores: number;
  detalle: FilaResultadoDTO[];
}

