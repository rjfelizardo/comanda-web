import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { syncWebhook } from '@/lib/whatsapp';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Reaponta o webhook do numero para o Comanda (so dono/gerente: a leitura da conta depende da regra do banco).
export async function POST(req: Request) {
  let b: any;
  try { b = await req.json(); } catch { return NextResponse.json({ error: 'Requisição inválida.' }, { status: 400 }); }
  const businessId = typeof b?.business_id === 'string' ? b.business_id.slice(0, 60) : '';
  const supa = supabaseServer();
  const { data: u } = await supa.auth.getUser();
  if (!u.user) return NextResponse.json({ error: 'Entre no painel novamente.' }, { status: 401 });

  const { data: acc } = await supa.from('wa_accounts').select('phone_number_id,waba_id').eq('business_id', businessId).eq('status', 'active').maybeSingle();
  if (!acc) return NextResponse.json({ error: 'WhatsApp não conectado, ou sem permissão.' }, { status: 403 });

  const { data: sec } = await supabaseAdmin().rpc('get_wa_account', { p_phone_number_id: acc.phone_number_id });
  const row = Array.isArray(sec) ? sec[0] : sec;
  if (!row?.token) return NextResponse.json({ error: 'Token não encontrado.' }, { status: 404 });

  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host') ?? '';
  const url = `https://${host}/api/whatsapp/webhook`;
  const r = await syncWebhook(row.token, acc.phone_number_id, acc.waba_id, url);
  const ok = r.phone?.ok === true;
  return NextResponse.json({ ok, url, ...r }, { status: ok ? 200 : 422 });
}
