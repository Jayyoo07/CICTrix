import { beforeEach, describe, expect, it, vi } from 'vitest';

const { isMock, eqMock, result } = vi.hoisted(() => ({
  isMock: vi.fn(),
  eqMock: vi.fn(),
  result: { data: [] as unknown[], error: null as unknown },
}));

vi.mock('../supabase', () => {
  const chain: any = {
    select: () => chain,
    is: (column: string, value: unknown) => {
      isMock(column, value);
      return chain;
    },
    eq: (column: string, value: unknown) => {
      eqMock(column, value);
      return chain;
    },
    order: async () => result,
  };
  return { supabase: { from: () => chain } };
});

import { DIVISION_PARENT_COLUMN, getDepartmentOptions, listDepartments } from './departments';

beforeEach(() => {
  isMock.mockClear();
  eqMock.mockClear();
  result.data = [];
  result.error = null;
});

describe('listDepartments', () => {
  it('asks for top-level offices only, so divisions never show up as offices', async () => {
    await listDepartments();
    expect(isMock).toHaveBeenCalledWith(DIVISION_PARENT_COLUMN, null);
    expect(eqMock).toHaveBeenCalledWith('is_active', true);
  });

  it('still excludes divisions when inactive offices are included', async () => {
    await listDepartments(true);
    expect(isMock).toHaveBeenCalledWith(DIVISION_PARENT_COLUMN, null);
    expect(eqMock).not.toHaveBeenCalled();
  });

  it('feeds the office dropdown options from that filtered list', async () => {
    result.data = [{ id: 'oce', name: 'Office of The City Engineer' }];
    expect(await getDepartmentOptions()).toEqual([
      { value: 'Office of The City Engineer', label: 'Office of The City Engineer' },
    ]);
    expect(isMock).toHaveBeenCalledWith(DIVISION_PARENT_COLUMN, null);
  });
});
