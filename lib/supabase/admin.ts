import 'server-only';
import { createClient } from '@supabase/supabase-js';

// SO no servidor. Usa a chave secreta (service_role). Nunca importar em componente de navegador.
export function supabaseAdmin() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY nao configurada');
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    db: { schema: 'comanda' },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
