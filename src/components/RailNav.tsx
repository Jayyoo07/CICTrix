// Collapsible side navigation rail (DESIGN_IDENTITY.md §9.12).
// Collapsed 72px icon rail by default; hover or keyboard focus opens it to
// 256px as an overlay; one highlight slides to the active item.

import { useEffect, useLayoutEffect, useRef, useState, type ComponentType } from 'react';
import { Link } from 'react-router-dom';
import '../styles/abyan-tokens.css';
import '../styles/rail-nav.css';

export interface RailNavItem {
  path: string;
  label: string;
  icon: ComponentType<{ size?: number; strokeWidth?: number; 'aria-hidden'?: boolean }>;
  isActive: boolean;
  /** Pinned to the bottom group (Settings). */
  bottom?: boolean;
}

const CLOSE_DELAY_MS = 250;              // grace period so brushing past the edge doesn't snap it shut
const HIGHLIGHT_Y_KEY = 'abyan:rail-highlight-y';

const readStoredY = (): number | null => {
  try {
    const raw = sessionStorage.getItem(HIGHLIGHT_Y_KEY);
    return raw === null ? null : Number(raw);
  } catch {
    return null;
  }
};

export function RailNav({ items, label = 'Main navigation' }: { items: RailNavItem[]; label?: string }) {
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<number | undefined>(undefined);
  const railRef = useRef<HTMLElement | null>(null);
  const itemRefs = useRef(new Map<string, HTMLAnchorElement>());
  // Every RSP page mounts its own copy of the rail, so the highlight starts at
  // the position it had on the previous page and slides from there.
  const [highlightY, setHighlightY] = useState<number | null>(readStoredY);
  const [animate, setAnimate] = useState(false);

  const active = items.find((item) => item.isActive) ?? null;

  const openRail = () => {
    window.clearTimeout(closeTimer.current);
    setOpen(true);
  };
  const closeRail = () => {
    window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setOpen(false), CLOSE_DELAY_MS);
  };
  useEffect(() => () => window.clearTimeout(closeTimer.current), []);

  // Measure the active item's offset inside the rail. The highlight lives on
  // the rail (not in a group), so it can also reach Settings at the bottom.
  const measure = () => {
    const rail = railRef.current;
    const el = active ? itemRefs.current.get(active.path) : undefined;
    if (!rail || !el) return null;
    return Math.round(el.getBoundingClientRect().top - rail.getBoundingClientRect().top);
  };

  useLayoutEffect(() => {
    const y = measure();
    if (y === null) return;
    const from = readStoredY();
    if (from === null || from === y) {
      setAnimate(false);
      setHighlightY(y);
    } else {
      // Paint at the previous position first, then slide. Two frames: the
      // first runs before that position is painted, the second after it.
      setAnimate(false);
      setHighlightY(from);
      let second = 0;
      // Store the new position only once the slide starts, so a mount that is
      // thrown away (dev StrictMode, a loading → content swap) doesn't make the
      // next mount think there is nothing to slide from.
      const first = window.requestAnimationFrame(() => {
        second = window.requestAnimationFrame(() => {
          setAnimate(true);
          setHighlightY(y);
          try { sessionStorage.setItem(HIGHLIGHT_Y_KEY, String(y)); } catch { /* ignore */ }
        });
      });
      return () => { window.cancelAnimationFrame(first); window.cancelAnimationFrame(second); };
    }
    try { sessionStorage.setItem(HIGHLIGHT_Y_KEY, String(y)); } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?.path]);

  // The bottom group moves with the viewport height; re-measure without animating.
  useEffect(() => {
    const onResize = () => {
      const y = measure();
      if (y === null) return;
      setAnimate(false);
      setHighlightY(y);
      try { sessionStorage.setItem(HIGHLIGHT_Y_KEY, String(y)); } catch { /* ignore */ }
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?.path]);

  const renderItem = (item: RailNavItem) => {
    const Icon = item.icon;
    return (
      <li key={item.path}>
        <Link
          to={item.path}
          ref={(el) => { if (el) itemRefs.current.set(item.path, el); else itemRefs.current.delete(item.path); }}
          className={`rail-item${item.isActive ? ' active' : ''}`}
          aria-label={item.label}
          aria-current={item.isActive ? 'page' : undefined}
        >
          <span className="rail-chip"><Icon size={20} strokeWidth={1.75} aria-hidden /></span>
          <span className="rail-label">{item.label}</span>
        </Link>
      </li>
    );
  };

  return (
    <div className="abyan-ds rail-slot">
      <aside
        ref={railRef}
        className={`rail${open ? ' open' : ''}`}
        aria-label={label}
        onMouseEnter={openRail}
        onMouseLeave={closeRail}
        onFocus={openRail}
        onBlur={(event) => {
          if (!railRef.current?.contains(event.relatedTarget as Node | null)) closeRail();
        }}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            (document.activeElement as HTMLElement | null)?.blur();
            closeRail();
          }
        }}
      >
        <div
          className={`rail-hl${animate ? '' : ' no-anim'}`}
          aria-hidden="true"
          style={{
            transform: `translateY(${highlightY ?? 0}px)`,
            visibility: active && highlightY !== null ? 'visible' : 'hidden',
          }}
        />
        <ul className="rail-nav">{items.filter((item) => !item.bottom).map(renderItem)}</ul>
        <ul className="rail-nav bottom">{items.filter((item) => item.bottom).map(renderItem)}</ul>
      </aside>
    </div>
  );
}
