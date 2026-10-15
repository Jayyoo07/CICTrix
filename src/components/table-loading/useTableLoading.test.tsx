import { act, render, renderHook, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  LOADER_MIN_VISIBLE_MS,
  LOADER_SHOW_DELAY_MS,
  TableSkeletonRows,
  useDelayedLoading,
  useTableLoading,
} from '.';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

const advance = (ms: number) => act(() => { vi.advanceTimersByTime(ms); });

describe('useDelayedLoading', () => {
  it('stays hidden when the load finishes inside the delay', () => {
    const { result, rerender } = renderHook(({ loading }) => useDelayedLoading(loading), { initialProps: { loading: true } });
    advance(LOADER_SHOW_DELAY_MS - 50);
    rerender({ loading: false });
    advance(1000);
    expect(result.current).toBe(false);
  });

  it('shows after the delay and holds for the minimum time', () => {
    const { result, rerender } = renderHook(({ loading }) => useDelayedLoading(loading), { initialProps: { loading: true } });
    advance(LOADER_SHOW_DELAY_MS);
    expect(result.current).toBe(true);

    advance(50);
    rerender({ loading: false });
    advance(LOADER_MIN_VISIBLE_MS - 100);
    expect(result.current).toBe(true);
    advance(100);
    expect(result.current).toBe(false);
  });

  it('hides right away when the loader was already up long enough', () => {
    const { result, rerender } = renderHook(({ loading }) => useDelayedLoading(loading), { initialProps: { loading: true } });
    advance(LOADER_SHOW_DELAY_MS + LOADER_MIN_VISIBLE_MS + 100);
    rerender({ loading: false });
    advance(0);
    expect(result.current).toBe(false);
  });
});

describe('useTableLoading', () => {
  it('treats a load with no rows as a first load', () => {
    const { result, rerender } = renderHook(({ loading, hasRows }) => useTableLoading(loading, hasRows), {
      initialProps: { loading: true, hasRows: false },
    });
    expect(result.current).toEqual({ initialLoading: true, showSkeleton: false, refreshing: false });
    advance(LOADER_SHOW_DELAY_MS);
    expect(result.current).toEqual({ initialLoading: true, showSkeleton: true, refreshing: false });

    // Rows arrive: the skeleton holds for the minimum time, then the rows show.
    rerender({ loading: false, hasRows: true });
    expect(result.current.initialLoading).toBe(true);
    advance(LOADER_MIN_VISIBLE_MS);
    expect(result.current).toEqual({ initialLoading: false, showSkeleton: false, refreshing: false });
  });

  it('treats a load with rows on screen as a refresh', () => {
    const { result, rerender } = renderHook(({ loading, hasRows }) => useTableLoading(loading, hasRows), {
      initialProps: { loading: false, hasRows: true },
    });
    rerender({ loading: true, hasRows: true });
    expect(result.current.initialLoading).toBe(false);
    advance(LOADER_SHOW_DELAY_MS);
    expect(result.current).toEqual({ initialLoading: false, showSkeleton: false, refreshing: true });

    rerender({ loading: false, hasRows: true });
    advance(LOADER_MIN_VISIBLE_MS);
    expect(result.current.refreshing).toBe(false);
  });
});

describe('TableSkeletonRows', () => {
  it('renders nothing until shown, then placeholder rows and a status', () => {
    const { rerender, container } = render(
      <table><tbody><TableSkeletonRows show={false} columns={3} rows={4} label="Loading applicants…" /></tbody></table>,
    );
    expect(container.querySelectorAll('tr')).toHaveLength(0);

    rerender(<table><tbody><TableSkeletonRows show columns={['two-line', 'badge', 'button']} rows={4} label="Loading applicants…" /></tbody></table>);
    expect(container.querySelectorAll('tr.tl-skel-row')).toHaveLength(4);
    expect(container.querySelectorAll('tr.tl-skel-row:first-child td')).toHaveLength(3);
    expect(screen.getByRole('status')).toHaveTextContent('Loading applicants…');
  });
});
