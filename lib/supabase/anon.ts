import { createClient } from '@supabase/supabase-js';

// Leitura publica (vitrine). Sem sessao, sem cookies.
export function supabaseAnon() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { db: { schema: 'comanda' }, global: { fetch: (input: RequestInfo | URL, init?: RequestInit) => fetch(input, { ...init, cache: 'no-store' }) }, auth: { persistSession: false, autoRefreshToken: false } }
  );
}
