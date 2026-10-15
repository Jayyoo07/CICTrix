import './table-loading.css';

/** What a placeholder cell looks like: one bar, name over subtext, a status pill, or a small button. */
export type SkeletonCell = 'text' | 'two-line' | 'badge' | 'button';

const DEFAULT_ROWS = 5;
// Varied bar widths read as text; identical widths read as a broken grid.
const TEXT_WIDTHS = ['72%', '56%', '64%', '48%', '60%'];

interface TableSkeletonRowsProps {
  /** Column count (all plain text), or one shape per column. */
  columns: number | SkeletonCell[];
  /** Placeholder rows; match the table's page size. */
  rows?: number;
  /** From useTableLoading().showSkeleton. While false, nothing renders, so fast loads don't flash. */
  show: boolean;
  /** Screen-reader status, e.g. "Loading applicants…". */
  label?: string;
}

function Cell({ shape, index }: { shape: SkeletonCell; index: number }) {
  const width = TEXT_WIDTHS[index % TEXT_WIDTHS.length];
  if (shape === 'two-line') {
    return (
      <>
        <span className="tl-skel" style={{ width }} />
        <span className="tl-skel tl-skel--sub" />
      </>
    );
  }
  if (shape === 'badge') return <span className="tl-skel tl-skel--badge" />;
  if (shape === 'button') return <span className="tl-skel tl-skel--button" />;
  return <span className="tl-skel" style={{ width }} />;
}

/**
 * Placeholder rows for a table's first load. Render them inside the real
 * <tbody>, under the real header, in place of the rows and the empty state.
 */
export function TableSkeletonRows({ columns, rows = DEFAULT_ROWS, show, label = 'Loading…' }: TableSkeletonRowsProps) {
  const shapes: SkeletonCell[] = typeof columns === 'number' ? Array<SkeletonCell>(columns).fill('text') : columns;
  if (!show) return null;
  return (
    <>
      {Array.from({ length: rows }, (_, r) => (
        <tr key={`tl-skel-${r}`} className="tl-skel-row" aria-hidden="true">
          {shapes.map((shape, c) => (
            <td key={c}>
              <Cell shape={shape} index={r + c} />
            </td>
          ))}
        </tr>
      ))}
      <tr className="tl-status-row">
        <td colSpan={shapes.length}>
          <span role="status" className="tl-sr-only">{label}</span>
        </td>
      </tr>
    </>
  );
}

interface TableRefreshBarProps {
  /** From useTableLoading().refreshing. */
  active: boolean;
  /** Number of columns, so the bar spans the table. */
  colSpan: number;
}

/**
 * A thin indeterminate bar under the header while a table refetches. Render it
 * as the last child of <thead>; dim the rows with `tableBodyClass`.
 */
export function TableRefreshBar({ active, colSpan }: TableRefreshBarProps) {
  return (
    <tr className="tl-bar-row" aria-hidden="true">
      <th colSpan={colSpan}>
        <div className={`tl-bar${active ? ' tl-bar--on' : ''}`}>
          <i />
        </div>
      </th>
    </tr>
  );
}

/** Class for the <tbody> holding real rows: fades rows in, and dims them while refreshing. */
export function tableBodyClass(refreshing: boolean): string {
  return refreshing ? 'tl-rows tl-rows--stale' : 'tl-rows';
}
