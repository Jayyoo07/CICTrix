# table-loading

Loading states for tables fed by Supabase. Built to option C in `docs/mockups/2026-10-16-table-loading-states.html`:

- **First load:** skeleton rows inside the real `<tbody>`, under the real header.
- **Refetch:** the current rows stay, dimmed, with a thin progress bar under the header.
- **Timing:** nothing shows for the first 200ms, and once shown a loader stays at least 400ms.

## Public interface

| Export | What it does |
|---|---|
| `useTableLoading(loading, hasRows)` | Returns `{ initialLoading, showSkeleton, refreshing }`. `hasRows` decides the mode when a load starts. |
| `<TableSkeletonRows columns rows show label />` | Placeholder `<tr>`s. `columns` is a count or a shape per column (`text`, `two-line`, `badge`, `button`). |
| `<TableRefreshBar active colSpan />` | The progress bar. Put it last in `<thead>`. |
| `<RefreshBar active />` | The same bar for div-based lists; place it in a `position: relative` container. |
| `tableBodyClass(refreshing)` | Class for the real-rows `<tbody>`: fades rows in, dims them while refreshing. |
| `<Skeleton className style />`, `<LoadingStatus label />` | One shimmer bar and a hidden status, for card grids and lists that aren't tables. |
| `<SkeletonList show rows label />` | Two-line placeholder rows for a list or panel that isn't a `<table>`. |
| `useDelayedLoading(loading)` | The 200ms / 400ms timing on its own, for loaders that aren't tables. |

```tsx
const { initialLoading, showSkeleton, refreshing } = useTableLoading(loading, rows.length > 0);

<table aria-busy={loading}>
  <thead>
    <tr>…</tr>
    <TableRefreshBar active={refreshing} colSpan={4} />
  </thead>
  <tbody className={tableBodyClass(refreshing)}>
    {initialLoading ? (
      <TableSkeletonRows show={showSkeleton} columns={['two-line', 'text', 'badge', 'button']} label="Loading applicants…" />
    ) : rows.length === 0 ? (
      <EmptyRow />
    ) : (
      rows.map(…)
    )}
  </tbody>
</table>
```

## Not handled

- Fetching. The caller owns its `loading` flag and its data.
- Errors and Retry. Show those in the table body yourself.
- Refetches that don't set `loading` (silent reloads) show no bar.

## Dependencies

React, and the tokens in `src/styles/abyan-tokens.css`.
