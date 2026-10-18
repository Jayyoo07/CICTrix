import { useLayoutEffect, useRef, useState } from 'react';

/** Loads faster than this never show a loader, so quick pages don't flash. */
export const LOADER_SHOW_DELAY_MS = 200;
/** Once shown, a loader stays at least this long, so it doesn't blink. */
export const LOADER_MIN_VISIBLE_MS = 400;

/**
 * Turns a raw `loading` flag into a flag that only goes true after
 * LOADER_SHOW_DELAY_MS, and, once true, stays true for at least
 * LOADER_MIN_VISIBLE_MS.
 */
export function useDelayedLoading(loading: boolean): boolean {
  const [visible, setVisible] = useState(false);
  const shownAt = useRef<number | null>(null);

  // A layout effect, so the delay timer is cleared in the same commit that
  // renders the data. With a passive effect the timer could fire between that
  // commit and the cleanup, and put the skeleton back over loaded rows.
  useLayoutEffect(() => {
    if (loading) {
      if (shownAt.current !== null) return undefined;
      const timer = setTimeout(() => {
        shownAt.current = Date.now();
        setVisible(true);
      }, LOADER_SHOW_DELAY_MS);
      return () => clearTimeout(timer);
    }

    if (shownAt.current === null) return undefined;
    const remaining = LOADER_MIN_VISIBLE_MS - (Date.now() - shownAt.current);
    const timer = setTimeout(() => {
      shownAt.current = null;
      setVisible(false);
    }, Math.max(0, remaining));
    return () => clearTimeout(timer);
  }, [loading]);

  return visible;
}

export interface TableLoadingState {
  /** First load is in progress: render <TableSkeletonRows> instead of rows or the empty state. */
  initialLoading: boolean;
  /** Pass to <TableSkeletonRows show>; false during the first 200ms, so fast loads stay blank. */
  showSkeleton: boolean;
  /** A refetch with rows already on screen: dim them and show <TableRefreshBar>. */
  refreshing: boolean;
}

/**
 * Loading state for one table. `hasRows` is whether the table had rows when
 * this load started: none means a first load (skeleton), some means a refetch
 * (dimmed rows and a progress bar).
 */
export function useTableLoading(loading: boolean, hasRows: boolean): TableLoadingState {
  const delayed = useDelayedLoading(loading);
  const firstLoad = useRef(!hasRows);
  const wasLoading = useRef(false);

  // Decide the mode at the moment a load starts, and keep it until the loader hides.
  if (loading && !wasLoading.current && !delayed) firstLoad.current = !hasRows;
  wasLoading.current = loading;

  const initial = firstLoad.current;
  return {
    initialLoading: initial && (loading || delayed),
    showSkeleton: initial && delayed,
    refreshing: !initial && delayed,
  };
}
