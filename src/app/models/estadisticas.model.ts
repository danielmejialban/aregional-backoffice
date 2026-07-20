export interface ItemConteoDTO {
  nombre: string;
  cantidad: number;
}

export interface DepartamentoTrackingDTO {
  departamento: string;
  totalAsignados: number;
  conCheckIn: number;
  sinCheckIn: number;
}

export interface EstadisticasResumenDTO {
  totalVoluntarios: number;
  totalEventos: number;
  totalCheckIns: number;
  totalDepartamentos: number;
  checkInsPorEvento: ItemConteoDTO[];
  voluntariosPorDepartamento: ItemConteoDTO[];
  checkInsPorDia: ItemConteoDTO[];
  checkInsPorDepartamento: ItemConteoDTO[];
  trackingPorDepartamento: DepartamentoTrackingDTO[];
}
