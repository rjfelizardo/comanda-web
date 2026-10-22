import { createClient } from '@supabase/supabase-js';

// Cliente SO para recuperar senha. Usa o fluxo "implicit": o link do e-mail traz o acesso
// dentro dele mesmo, entao funciona mesmo se o e-mail for aberto em outro navegador/app.
export function supabaseRecovery() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { flowType: 'implicit', persistSession: false, autoRefreshToken: false, detectSessionInUrl: true } }
  );
}
