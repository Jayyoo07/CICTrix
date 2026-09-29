import { isMockModeEnabled } from './supabase';

// Deliberately ignores the legacy cictrix_data_source_mode localStorage key, which left browsers stuck on mock data.
export const getPreferredDataSourceMode = (): 'local' | 'supabase' =>
  isMockModeEnabled ? 'local' : 'supabase';
