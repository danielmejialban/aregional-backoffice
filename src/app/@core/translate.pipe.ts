import { Pipe, PipeTransform } from '@angular/core';

const ES: Record<string, string> = {
  'DataTable.NoData': 'Sin datos',
  'DataTable.Results': 'Resultados',
  'DataTable.ResultsShown': 'Mostrados',
  'DataTable.FiltersActive': 'Filtros activos',
  'DataTable.ManualMode': 'Búsqueda manual',
  'DataTable.PendingChanges': 'Cambios pendientes',
  'DataTable.FiltersApplied': 'Filtros aplicados',
  'DataTable.ToggleColumns': 'Columnas visibles',
  'DataTable.ExportCsv': 'Exportar CSV',
  'DataTable.Search': 'Buscar',
  'DataTable.ClearFilters': 'Limpiar filtros',
  'DataTable.ActiveFilters': 'Filtros activos',
  'DataTable.ClearFilter': 'Eliminar filtro',
  'DataTable.Loading': 'Cargando...',
  'DataTable.FilterValue': 'Filtrar...',
  'DataTable.SelectValue': 'Seleccionar...',
  'DataTable.From': 'Desde',
  'DataTable.To': 'Hasta',
  'DataTable.NotFilterable': '',
  'DataTable.SelectAll': 'Seleccionar todo',
};

@Pipe({ name: 'translate', standalone: true, pure: true })
export class TranslatePipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    if (value == null) return '';
    return ES[value] ?? value;
  }
}
