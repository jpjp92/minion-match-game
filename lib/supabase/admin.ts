import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { StageError } from '../apiError.ts';

export function createSupabaseAdminClient() {
  const url = process.env.SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!url || !secretKey) {
    throw new StageError('supabase_admin_env_missing');
  }

  return createClient(url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

