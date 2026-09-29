import { afterEach, describe, expect, it, vi } from 'vitest';

const LEGACY_MODE_KEY = 'cictrix_data_source_mode';

const loadWithMockMode = async (enabled: boolean) => {
  vi.resetModules();
  vi.doMock('./supabase', () => ({ isMockModeEnabled: enabled }));
  return (await import('./dataSourceMode')).getPreferredDataSourceMode;
};

afterEach(() => {
  localStorage.clear();
  vi.doUnmock('./supabase');
});

describe('getPreferredDataSourceMode', () => {
  it('reads the live database even when a browser is stuck on the legacy local flag', async () => {
    localStorage.setItem(LEGACY_MODE_KEY, 'local');
    const getMode = await loadWithMockMode(false);
    expect(getMode()).toBe('supabase');
  });

  it('uses mock data only when the env flag enables it', async () => {
    const getMode = await loadWithMockMode(true);
    expect(getMode()).toBe('local');
  });
});
