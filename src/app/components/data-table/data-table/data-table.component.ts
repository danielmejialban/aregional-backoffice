import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  AfterViewInit,
  OnChanges,
  SimpleChanges,
  ViewChild,
  DestroyRef,
  inject,
  booleanAttribute,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { SelectionModel } from '@angular/cdk/collections';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, Subject } from 'rxjs';
import { map, startWith, takeUntil } from 'rxjs/operators';
import { PageEvent } from '@angular/material/paginator';
import { Sort } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MAT_DATE_FORMATS, MAT_DATE_LOCALE, DateAdapter } from '@angular/material/core';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslatePipe, LoaderComponent, ActiveFilters, ColumnDef, DateRangeFilter, SelectionMode, TableActionEvent } from '@app/@core';

const CUSTOM_DATE_FORMATS = {
  parse: {
    dateInput: 'dd/MM/yyyy',
  },
  display: {
    dateInput: 'dd/MM/yyyy',
    monthYearLabel: 'MMM yyyy',
    dateA11yLabel: 'LL',
    monthYearA11yLabel: 'MMMM yyyy',
  },
};

interface ActiveFilterChip {
  key: string;
  label: string;
  value: string;
}

@Component({
  selector: 'app-data-table',
  templateUrl: './data-table.component.html',
  styleUrls: ['./data-table.component.scss'],
  preserveWhitespaces: false,
  standalone: true,
  providers: [{ provide: MAT_DATE_FORMATS, useValue: CUSTOM_DATE_FORMATS }],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatAutocompleteModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatCheckboxModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatTooltipModule,
    TranslatePipe,
    LoaderComponent,
  ],
})
export class DataTableComponent implements OnInit, AfterViewInit, OnChanges {
  // ─── Data inputs ────────────────────────────────────────────────────────────

  /** Column definitions array. Changes after init require re-creating the component. */
  @Input() columns: ColumnDef[] = [];

  /** Row data. Re-assignable at any time; table updates automatically. */
  @Input() data: any[] = [];

  // ─── Loading & empty state ───────────────────────────────────────────────

  /** Show the spinner overlay while `true`. */
  @Input() isLoading = false;

  /** i18n key or plain text for the empty-state message. */
  @Input() emptyMessage = 'DataTable.NoData';

  /** Material icon name shown in the empty state. */
  @Input() emptyIcon = 'inbox';

  // ─── Pagination ──────────────────────────────────────────────────────────

  /**
   * **Flag** — when `true` the component emits `filterChange`, `pageChange`
   * and `sortChange` instead of handling them client-side.
   * Set `totalItems` to control the paginator length.
   */
  @Input() serverSide = false;

  /** Total record count for server-side pagination. */
  @Input() totalItems = 0;

  /** Available page size options shown in the paginator. */
  @Input() pageSizeOptions: number[] = [10, 25, 50];

  /** Tamaño de página controlado por el contenedor padre. */
  @Input() pageSize?: number;

  /** Índice de página actual controlado por el contenedor padre. */
  @Input() pageIndex = 0;

  // ─── Feature flags ────────────────────────────────────────────────────────

  /**
   * **Flag** — show the "Clear filters" button in the toolbar.
   * The button is disabled automatically when no filter is active.
   */
  @Input() showClearButton = true;

  /**
   * **Flag** — show the column-visibility toggle menu in the toolbar.
   * Set `columnVisibilityKey` to persist visibility in `localStorage`.
   */
  @Input() showColumnToggle = false;

  /**
   * **Flag** — show the "Export CSV" button in the toolbar.
   * Use `exportFileName` to customise the downloaded file name.
   */
  @Input() showExportButton = false;

  /**
   * File name (without extension) used when the CSV is downloaded.
   * Only relevant when `showExportButton` is `true`. Defaults to `'export'`.
   */
  @Input() exportFileName = 'export';

  /**
   * **Flag** — muestra el resumen superior con resultados, filtros activos y
   * contexto de la tabla.
   */
  @Input({ transform: booleanAttribute }) showResultsSummary = true;

  /**
   * **Flag** — muestra la zona de chips de filtros activos bajo la toolbar.
   */
  @Input({ transform: booleanAttribute }) showActiveFilterChips = true;

  /**
   * **Flag** — muestra la fila visual de filtros dentro del header de tabla.
   * Puede desactivarse para usos puramente display.
   */
  @Input({ transform: booleanAttribute }) showFilterRow = true;

  /**
   * **Flag** — muestra un indicador visual sutil en columnas filtrables.
   */
  @Input({ transform: booleanAttribute }) showFilterIndicators = true;

  /**
   * **Flag** — row selection mode.
   * - `'none'`  → no selection (default)
   * - `'single'` → single-row selection (radio behaviour)
   * - `'multi'`  → multi-row selection with master checkbox
   */
  @Input() selectionMode: SelectionMode = 'none';

  /**
   * **Flag** — CSS `max-height` for the table scroll container
   * (e.g. `'500px'`). When set, the table body scrolls vertically
   * while the header remains sticky.
   */
  @Input() maxHeight?: string;

  /**
   * **Flag** — when `false`, the sort-direction arrow is hidden via CSS.
   * The column remains sortable (click still triggers `sortChange`) but
   * no arrow indicator is rendered, giving a cleaner centered header.
   * Default: `true`.
   */
  @Input() showSortArrow = true;

  /**
   * **Flag** — `localStorage` key used to persist column visibility across
   * sessions. Only works when `showColumnToggle` is also `true`.
   */
  @Input() columnVisibilityKey?: string;

  /**
   * **Flag** — when `true`, filter changes do **not** auto-emit `filterChange`.
   * Instead a "Search" button appears in the toolbar; the user must click it
   * to apply filters. `clearFilters()` always applies immediately regardless
   * of this flag.
   */
  @Input() showSearchButton = false;

  /**
   * **Format** — formato visual para los inputs de fecha en el datepicker.
   * Default: `'dd/MM/yyyy'`.
   */
  @Input() dateFormat = 'dd/MM/yyyy';

  // ─── Outputs ──────────────────────────────────────────────────────────────

  /**
   * Emitted every time a filter value changes.
   * In **server-side** mode this is the trigger to re-fetch data.
   * Value shape: `{ [columnKey]: string | { from, to } | null }`.
   */
  @Output() filterChange = new EventEmitter<ActiveFilters>();

  /** Emitted on paginator page change (server-side mode). */
  @Output() pageChange = new EventEmitter<PageEvent>();

  /** Emitted on sort change (server-side mode). */
  @Output() sortChange = new EventEmitter<Sort>();

  /** Emitted when a data row is clicked (not on action buttons). */
  @Output() rowClick = new EventEmitter<any>();

  /**
   * Emitted whenever the selection changes.
   * Value is the full array of currently selected rows.
   */
  @Output() rowSelect = new EventEmitter<any[]>();

  /**
   * Emitted when an action icon button is clicked.
   * Value: `{ action: ActionDef.id, row }`.
   */
  @Output() actionClick = new EventEmitter<TableActionEvent>();

  // ─── ViewChild ───────────────────────────────────────────────────────────

  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  // ─── Internal state ───────────────────────────────────────────────────────

  dataSource = new MatTableDataSource<any>();
  selection = new SelectionModel<any>(false, []);

  /** FormControl per text / autocomplete / select column. */
  filterControls: Record<string, FormControl<string | null>> = {};

  /** Start + end controls per dateRange column. */
  dateRangeControls: Record<string, { start: FormControl<Date | null>; end: FormControl<Date | null> }> = {};

  /** Pre-computed filtered options observables per autocomplete column. */
  filteredOptionsMap: Record<string, Observable<string[]>> = {};

  /** Keys of currently hidden columns. */
  hiddenColumns = new Set<string>();

  /** Firma serializada del último conjunto de filtros realmente aplicado. */
  private lastAppliedFiltersSignature = '';

  private readonly destroyRef = inject(DestroyRef);

  /**
   * Subject completed every time `initFilters()` runs so that stale
   * FormControl subscriptions are discarded on column re-init.
   */
  private readonly filterReset$ = new Subject<void>();

  // ─── Computed ─────────────────────────────────────────────────────────────

  get visibleColumns(): string[] {
    const cols: string[] = [];
    if (this.selectionMode !== 'none') cols.push('_select');
    (this.columns ?? []).filter((c) => !this.hiddenColumns.has(c.key)).forEach((c) => cols.push(c.key));
    return cols;
  }

  /** Columns that can appear in the toggle menu (actions column excluded). */
  get toggleableColumns(): ColumnDef[] {
    return (this.columns ?? []).filter((c) => c.type !== 'actions');
  }

  get hasActiveFilters(): boolean {
    const hasText = Object.values(this.filterControls).some((c) => !!c.value);
    const hasDate = Object.values(this.dateRangeControls).some((dr) => !!dr.start.value || !!dr.end.value);
    return hasText || hasDate;
  }

  get filteredResultsCount(): number {
    return this.serverSide ? this.data.length : this.dataSource.filteredData.length;
  }

  get totalResultsCount(): number {
    return this.serverSide ? this.totalItems : this.dataSource.filteredData.length;
  }

  get isManualFilterMode(): boolean {
    return this.showSearchButton;
  }

  get hasPendingFilterChanges(): boolean {
    if (!this.showSearchButton) return false;
    return this.serializeFilters(this.collectFilters()) !== this.lastAppliedFiltersSignature;
  }

  get activeFilterChips(): ActiveFilterChip[] {
    const chips: ActiveFilterChip[] = [];

    for (const col of this.columns ?? []) {
      if (col.filterType === 'text' || col.filterType === 'autocomplete' || col.filterType === 'select') {
        const rawValue = this.filterControls[col.key]?.value?.trim();
        if (rawValue) {
          chips.push({
            key: col.key,
            label: col.header,
            value: rawValue,
          });
        }
      }

      if (col.filterType === 'dateRange') {
        const range = this.dateRangeControls[col.key];
        const start = range?.start.value;
        const end = range?.end.value;

        if (start || end) {
          const fromLabel = start ? this.formatFilterDate(start) : '—';
          const toLabel = end ? this.formatFilterDate(end) : '—';

          chips.push({
            key: col.key,
            label: col.header,
            value: `${fromLabel} → ${toLabel}`,
          });
        }
      }
    }

    return chips;
  }

  // ─── Lifecycle ────────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.selection = new SelectionModel<any>(this.selectionMode === 'multi', []);
    this.initFilters();
    this.initHiddenColumns();
    this.setupClientSideFilterPredicate();
    this.dataSource.data = this.data ?? [];
    this.markFiltersAsApplied();
  }

  ngAfterViewInit(): void {
    this.syncPaginatorState();

    if (this.serverSide) {
      this.paginator.page.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((event) => this.pageChange.emit(event));

      this.sort.sortChange.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((s) => {
        this.sortChange.emit(s);
        this.paginator.firstPage();
      });

      this.paginator.length = this.totalItems;
    } else {
      this.dataSource.sort = this.sort;
      this.dataSource.paginator = this.paginator;
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['columns'] && !changes['columns'].isFirstChange()) {
      this.initFilters();
      this.initHiddenColumns();
      this.markFiltersAsApplied();
    }

    if (changes['data']) {
      this.dataSource.data = this.data ?? [];
      if (!this.serverSide) this.triggerClientFilter();
    }

    if (changes['totalItems'] && this.paginator && this.serverSide) {
      this.paginator.length = this.totalItems;
    }

    if ((changes['pageSize'] || changes['pageIndex'] || changes['pageSizeOptions']) && this.paginator) {
      this.syncPaginatorState();
    }

    if (changes['selectionMode']) {
      this.selection = new SelectionModel<any>(this.selectionMode === 'multi', []);
    }
  }

  private syncPaginatorState(): void {
    if (!this.paginator) return;

    this.paginator.pageSize = this.resolvedPageSize;
    this.paginator.pageIndex = this.pageIndex ?? 0;
  }

  private get resolvedPageSize(): number {
    return this.pageSize ?? this.pageSizeOptions[0] ?? 10;
  }

  // ─── Filter initialisation ─────────────────────────────────────────────

  private initFilters(): void {
    this.filterReset$.next(); // discard old subscriptions
    this.filterControls = {};
    this.dateRangeControls = {};
    this.filteredOptionsMap = {};

    (this.columns ?? []).forEach((col) => {
      if (col.filterType === 'text' || col.filterType === 'autocomplete' || col.filterType === 'select') {
        const ctrl = new FormControl<string | null>(null);
        this.filterControls[col.key] = ctrl;

        if (!this.showSearchButton) {
          ctrl.valueChanges
            .pipe(takeUntil(this.filterReset$), takeUntilDestroyed(this.destroyRef))
            .subscribe(() => (this.serverSide ? this.emitFilters() : this.triggerClientFilter()));
        }

        if (col.filterType === 'autocomplete') {
          this.filteredOptionsMap[col.key] = ctrl.valueChanges.pipe(
            startWith(''),
            map((val) => {
              const lower = (val ?? '').toLowerCase();
              return (col.filterOptions ?? []).filter((o: string) => o.toLowerCase().includes(lower));
            })
          );
        }
      }

      if (col.filterType === 'dateRange') {
        const start = new FormControl<Date | null>(null);
        const end = new FormControl<Date | null>(null);
        this.dateRangeControls[col.key] = { start, end };

        if (!this.showSearchButton) {
          end.valueChanges.pipe(takeUntil(this.filterReset$), takeUntilDestroyed(this.destroyRef)).subscribe((v) => {
            if (v) this.serverSide ? this.emitFilters() : this.triggerClientFilter();
          });
          start.valueChanges.pipe(takeUntil(this.filterReset$), takeUntilDestroyed(this.destroyRef)).subscribe((v) => {
            if (!v && !end.value) this.serverSide ? this.emitFilters() : this.triggerClientFilter();
          });
        }
      }
    });
  }

  // ─── Column visibility ────────────────────────────────────────────────

  private initHiddenColumns(): void {
    const persisted = this.loadPersistedVisibility();
    this.hiddenColumns = new Set<string>();
    (this.columns ?? []).forEach((col) => {
      const state = persisted?.[col.key];
      if (state !== undefined ? state : col.hidden) {
        this.hiddenColumns.add(col.key);
      }
    });
  }

  toggleColumn(key: string): void {
    this.hiddenColumns.has(key) ? this.hiddenColumns.delete(key) : this.hiddenColumns.add(key);
    this.persistVisibility();
  }

  isColumnVisible(key: string): boolean {
    return !this.hiddenColumns.has(key);
  }

  private persistVisibility(): void {
    if (!this.columnVisibilityKey) return;
    const state: Record<string, boolean> = {};
    (this.columns ?? []).forEach((c) => (state[c.key] = this.hiddenColumns.has(c.key)));
    localStorage.setItem(this.columnVisibilityKey, JSON.stringify(state));
  }

  private loadPersistedVisibility(): Record<string, boolean> | null {
    if (!this.columnVisibilityKey) return null;
    try {
      const raw = localStorage.getItem(this.columnVisibilityKey);
      return raw ? (JSON.parse(raw) as Record<string, boolean>) : null;
    } catch {
      return null;
    }
  }

  // ─── Client-side filter ───────────────────────────────────────────────

  private setupClientSideFilterPredicate(): void {
    this.dataSource.filterPredicate = (row: any, _str: string): boolean => {
      for (const col of this.columns ?? []) {
        if (col.filterType === 'text' || col.filterType === 'autocomplete' || col.filterType === 'select') {
          const val = this.filterControls[col.key]?.value?.trim().toLowerCase();
          if (
            val &&
            !String(row[col.key] ?? '')
              .toLowerCase()
              .includes(val)
          )
            return false;
        }

        if (col.filterType === 'dateRange') {
          const dr = this.dateRangeControls[col.key];
          if (!dr) continue;
          const cellDate = new Date(row[col.key]);
          if (isNaN(cellDate.getTime())) continue;
          if (dr.start.value && cellDate < dr.start.value) return false;
          if (dr.end.value) {
            const endOfDay = new Date(dr.end.value);
            endOfDay.setHours(23, 59, 59, 999);
            if (cellDate > endOfDay) return false;
          }
        }
      }
      return true;
    };
  }

  private triggerClientFilter(): void {
    this.dataSource.filter = JSON.stringify(this.collectFilters());
    this.dataSource.paginator?.firstPage();
    this.markFiltersAsApplied();
  }

  // ─── Server-side filter emit ──────────────────────────────────────────

  private emitFilters(): void {
    this.filterChange.emit(this.collectFilters());
    this.paginator?.firstPage();
    this.markFiltersAsApplied();
  }

  private collectFilters(): ActiveFilters {
    const filters: ActiveFilters = {};

    for (const col of this.columns ?? []) {
      if (col.filterType === 'text' || col.filterType === 'autocomplete' || col.filterType === 'select') {
        filters[col.key] = this.filterControls[col.key]?.value ?? null;
      }

      if (col.filterType === 'dateRange') {
        const dr = this.dateRangeControls[col.key];
        filters[col.key] = {
          from: dr?.start.value
            ? new Date(
                Date.UTC(dr.start.value.getFullYear(), dr.start.value.getMonth(), dr.start.value.getDate(), 0, 0, 0, 0)
              ).toISOString()
            : null,
          to: dr?.end.value
            ? new Date(
                Date.UTC(dr.end.value.getFullYear(), dr.end.value.getMonth(), dr.end.value.getDate(), 23, 59, 59, 999)
              ).toISOString()
            : null,
        } satisfies DateRangeFilter;
      }
    }
    return filters;
  }

  private markFiltersAsApplied(): void {
    this.lastAppliedFiltersSignature = this.serializeFilters(this.collectFilters());
  }

  private serializeFilters(filters: ActiveFilters): string {
    const normalized = Object.keys(filters)
      .sort()
      .reduce<Record<string, string | DateRangeFilter | null>>((acc, key) => {
        const value = filters[key];

        if (typeof value === 'string') {
          acc[key] = value.trim() || null;
          return acc;
        }

        if (value && typeof value === 'object' && 'from' in value && 'to' in value) {
          acc[key] = {
            from: value.from ?? null,
            to: value.to ?? null,
          };
          return acc;
        }

        acc[key] = value ?? null;
        return acc;
      }, {});

    return JSON.stringify(normalized);
  }

  // ─── Public filter helpers ────────────────────────────────────────────

  clearFilters(): void {
    Object.values(this.filterControls).forEach((c) => c.setValue(null, { emitEvent: false }));
    Object.values(this.dateRangeControls).forEach((dr) => {
      dr.start.setValue(null, { emitEvent: false });
      dr.end.setValue(null, { emitEvent: false });
    });
    this.serverSide ? this.emitFilters() : this.triggerClientFilter();
  }

  clearSingleFilter(key: string): void {
    this.filterControls[key]?.setValue(null);
  }

  clearFilterChip(key: string): void {
    if (this.dateRangeControls[key]) {
      this.dateRangeControls[key].start.setValue(null, { emitEvent: false });
      this.dateRangeControls[key].end.setValue(null, { emitEvent: false });
      this.serverSide ? this.emitFilters() : this.triggerClientFilter();
      return;
    }

    this.clearSingleFilter(key);
  }

  /**
   * Manually applies current filters. Called by the toolbar "Search" button
   * when `showSearchButton === true`.
   * Can also be called programmatically from the parent if needed.
   */
  search(): void {
    this.serverSide ? this.emitFilters() : this.triggerClientFilter();
  }

  private formatFilterDate(value: Date): string {
    return value.toLocaleDateString(undefined, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  // ─── CSV Export ───────────────────────────────────────────────────────

  exportToCsv(): void {
    const cols = (this.columns ?? []).filter(
      (c) => c.exportable !== false && c.type !== 'actions' && !this.hiddenColumns.has(c.key)
    );

    const header = cols.map((c) => `"${c.header}"`).join(',');
    const sourceData = this.serverSide ? this.data : this.dataSource.filteredData;

    const rows = sourceData.map((row) =>
      cols
        .map((c) => {
          let val = row[c.key];
          if (c.type === 'date' && val) {
            try {
              val = new Date(val).toLocaleString('es', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });
            } catch {
              val = String(val);
            }
          }
          return `"${String(val ?? '').replace(/"/g, '""')}"`;
        })
        .join(',')
    );

    const csv = [header, ...rows].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${this.exportFileName ?? 'export'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ─── Row events ───────────────────────────────────────────────────────

  onRowClick(row: any): void {
    this.rowClick.emit(row);
  }

  onAction(actionId: string, row: any, event: MouseEvent): void {
    event.stopPropagation();
    this.actionClick.emit({ action: actionId, row });
  }

  // ─── Selection ────────────────────────────────────────────────────────

  isAllSelected(): boolean {
    return this.dataSource.data.length > 0 && this.selection.selected.length === this.dataSource.data.length;
  }

  isSomeSelected(): boolean {
    return this.selection.selected.length > 0 && !this.isAllSelected();
  }

  masterToggle(): void {
    this.isAllSelected() ? this.selection.clear() : this.dataSource.data.forEach((r) => this.selection.select(r));
    this.rowSelect.emit(this.selection.selected);
  }

  toggleRow(row: any): void {
    if (this.selectionMode === 'single') this.selection.clear();
    this.selection.toggle(row);
    this.rowSelect.emit(this.selection.selected);
  }
}
