import { useCallback, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

/**
 * "Back" that returns to the page the user actually came from.
 *
 * React Router stores the in-app history position in `window.history.state.idx`.
 * When there is an earlier in-app entry we step back to it; when the page was
 * opened directly (new tab, bookmark, refresh after login) there is nothing to
 * go back to, so we replace the current entry with `fallback` instead of
 * leaving the app or landing on a login screen.
 */
export function useHistoryBack(fallback: string) {
  const navigate = useNavigate();
  return useCallback(() => {
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
    if (idx > 0) navigate(-1);
    else navigate(fallback, { replace: true });
  }, [navigate, fallback]);
}

/**
 * Makes the browser's Back button close an in-page view (a drill-down, detail
 * panel or modal driven by component state) instead of leaving the page.
 *
 * Opening the view pushes a history entry for the same URL, tagged with
 * `key`. Browser Back pops that entry and we call `close()`. Closing the view
 * any other way (its own back or close button) pops the entry for us, so
 * history never collects stale steps. Use a distinct `key` per nested level.
 *
 * `fromMount`: for a component that only exists while its view is open (its
 * parent renders it and passes `onBack`), pass `isOpen = true` and
 * `{ fromMount: true }`, so mounting counts as opening.
 */
export function useBackClosesView(
  isOpen: boolean,
  close: () => void,
  key = 'view',
  { fromMount = false }: { fromMount?: boolean } = {},
) {
  const navigate = useNavigate();
  const location = useLocation();
  const marker = `__back_${key}`;
  const pushed = useRef(false);
  // Only react to a missing tag after the tagged entry has actually been
  // reached; before that, the location still predates our push.
  const reachedTagged = useRef(false);
  const pushedUrl = useRef('');
  const closeRef = useRef(close);
  closeRef.current = close;
  // A view that is already open on first render came from the URL or props
  // (a deep link), so Back should leave the page rather than close it.
  const openedOnLoad = useRef(isOpen && !fromMount);

  // Opened → push a tagged entry at the same URL (keeps earlier levels' tags).
  useEffect(() => {
    if (!isOpen) openedOnLoad.current = false;
    if (isOpen && !pushed.current && !openedOnLoad.current) {
      pushed.current = true;
      reachedTagged.current = false;
      pushedUrl.current = `${location.pathname}${location.search}`;
      const state = { ...((location.state as Record<string, unknown> | null) ?? {}), [marker]: true };
      navigate(`${location.pathname}${location.search}${location.hash}`, { state });
    }
    // Closed from inside the page while our entry is still on top → pop it.
    if (!isOpen && pushed.current) {
      pushed.current = false;
      if (reachedTagged.current) navigate(-1);
      reachedTagged.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Browser Back removed our tag while the view is open → close the view.
  useEffect(() => {
    if (!pushed.current) return;
    const tagged = Boolean((location.state as Record<string, unknown> | null)?.[marker]);
    if (tagged) {
      reachedTagged.current = true;
    } else if (reachedTagged.current) {
      pushed.current = false;
      reachedTagged.current = false;
      closeRef.current();
    }
  }, [location, marker]);

  // Unmounted while open (e.g. the parent closed it via its own back button)
  // and the user is still on the same URL → drop our entry. If the user
  // navigated somewhere else, leave history alone.
  useEffect(() => () => {
    if (!pushed.current || !reachedTagged.current) return;
    if (`${window.location.pathname}${window.location.search}` !== pushedUrl.current) return;
    const state = window.history.state as { usr?: Record<string, unknown> } | null;
    if (state?.usr?.[marker]) window.history.back();
  }, [marker]);
}
