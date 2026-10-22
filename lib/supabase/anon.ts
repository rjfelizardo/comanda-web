import { createClient } from '@supabase/supabase-js';

// Leitura publica (vitrine). Sem sessao, sem cookies.
export function supabaseAnon() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { db: { schema: 'comanda' }, auth: { persistSession: false, autoRefreshToken: false } }
  );
}
