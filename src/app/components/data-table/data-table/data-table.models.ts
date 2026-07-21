import { TemplateRef } from '@angular/core';

// ─── Column ──────────────────────────────────────────────────────────────────

/** How a cell value is rendered. */
export type ColumnType = 'text' | 'date' | 'number' | 'badge' | 'actions' | 'custom';

/** Filter control shown in the header cell. */
export type FilterType = 'text' | 'autocomplete' | 'dateRange' | 'select' | 'none';

/** Whether a column sticks to the start or end of the table on horizontal scroll. */
export type StickyPosition = 'start' | 'end';

/** Row selection mode. */
export type SelectionMode = 'none' | 'single' | 'multi';

// ─── Action button ───────────────────────────────────────────────────────────

export interface ActionDef {
  /** Identifier emitted in the `actionClick` output. */
  id: string;
  /** Material icon ligature (e.g. `'edit'`, `'delete'`). */
  icon: string;
  /** Override icon dynamically based on the row. */
  iconFn?: (row: any) => string;
  /** Tooltip label — plain text or i18n key passed through `TranslatePipe`. */
  label: string;
  /** Angular Material button colour. */
  color?: 'primary' | 'accent' | 'warn' | '';
  /** Return `true` to disable the action button for a specific row. */
  disabled?: (row: any) => boolean;
  /** Return `true` to hide (not render) the action button for a specific row. */
  hidden?: (row: any) => boolean;
}

// ─── Column definition ───────────────────────────────────────────────────────

export interface ColumnDef {
  /** Key in the row data object used to read the cell value. */
  key: string;

  /** Header label — plain text or i18n key passed through `TranslatePipe`. */
  header: string;

  /**
   * How the cell value is rendered.
   * - `text`    → raw string (default)
   * - `date`    → Angular `DatePipe` with optional `dateFormat`
   * - `number`  → Angular `DecimalPipe`
   * - `badge`   → coloured `<span>` driven by `badgeMap`
   * - `actions` → row of icon buttons driven by `actions`
   * - `custom`  → arbitrary `TemplateRef` via `cellTemplate`
   */
  type?: ColumnType;

  /**
   * Interactive filter control rendered inside the header cell.
   * - `text`         → plain text input
   * - `autocomplete` → text input with `MatAutocomplete` dropdown (needs `filterOptions`)
   * - `select`       → `MatSelect` dropdown (needs `filterOptions`)
   * - `dateRange`    → `MatDateRangePicker` emitting `{ from, to }` ISO strings
   * - `none`         → no filter, just the column label (default)
   */
  filterType?: FilterType;

  /** Static options list for `autocomplete` or `select` filter types. */
  filterOptions?: string[];

  /**
   * Only relevant when `filterType === 'autocomplete'`.
   * - `true` (default) — renders a dropdown with `filterOptions` as suggestions;
   *   the user may still type freely but gets guided by the list.
   * - `false` — renders a plain text input with no dropdown; the user writes
   *   freely without any constraint from `filterOptions`.
   */
  combo?: boolean;

  /**
   * Angular `DatePipe` format string. Only used when `type === 'date'`.
   * Defaults to `'dd/MM/yyyy HH:mm'`.
   */
  dateFormat?: string;

  /** Whether this column supports `MatSort`. Default: `false`. */
  sortable?: boolean;

  /** Pin the column to the left (`'start'`) or right (`'end'`) edge. */
  sticky?: StickyPosition;

  /** CSS width applied to the column (e.g. `'180px'`, `'12%'`). */
  width?: string;

  /**
   * Arbitrary cell template for `type === 'custom'`.
   * The implicit context variable `$implicit` is the row object.
   *
   * ```html
   * <ng-template #myTpl let-row>
   *   <mat-chip>{{ row.status }}</mat-chip>
   * </ng-template>
   * ```
   */
  cellTemplate?: TemplateRef<{ $implicit: any }>;

  /**
   * Maps a cell value to a CSS class applied to the badge `<span>`.
   * Built-in classes: `dt-badge--primary`, `dt-badge--success`,
   * `dt-badge--warn`, `dt-badge--danger`, `dt-badge--neutral`.
   *
   * @example
   * ```ts
   * badgeMap: { ACTIVE: 'dt-badge--success', INACTIVE: 'dt-badge--danger' }
   * ```
   */
  badgeMap?: Record<string, string>;

  /**
   * Returns a tooltip string for a cell given its row.
   * Set to `undefined` to disable tooltip for this column.
   */
  tooltip?: (row: any) => string;

  /**
   * When `true` the column starts hidden.
   * Visibility can be restored via the column-toggle menu
   * (`showColumnToggle` flag on the table).
   */
  hidden?: boolean;

  /**
   * Whether this column is included in CSV export.
   * Defaults to `true`. `actions` columns are always excluded.
   */
  exportable?: boolean;

  /** Action buttons rendered when `type === 'actions'`. */
  actions?: ActionDef[];

  /**
   * Optional click handler for `badge` cells. When set, the badge renders with
   * `cursor: pointer` and calls this function with the row on click.
   */
  click?: (row: any) => void;
}

// ─── Event payloads ─────────────────────────────────────────────────────────

export interface TableActionEvent<T = any> {
  /** `id` of the clicked `ActionDef`. */
  action: string;
  /** Row object that owns the action. */
  row: T;
}

export interface DateRangeFilter {
  from: string | null; // ISO string or null
  to: string | null; // ISO string or null
}

/** Shape of the object emitted by `(filterChange)`. */
export type ActiveFilters = Record<string, string | DateRangeFilter | null>;
