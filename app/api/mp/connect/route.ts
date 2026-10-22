import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { mpFetch } from '@/lib/mercadopago';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Valida o Access Token no Mercado Pago e o guarda no Vault (so dono/gerente; a regra esta no banco).
export async function POST(req: Request) {
  let b: any;
  try { b = await req.json(); } catch { return NextResponse.json({ error: 'Requisição inválida.' }, { status: 400 }); }
  const businessId = typeof b?.business_id === 'string' ? b.business_id.slice(0, 60) : '';
  const token = typeof b?.token === 'string' ? b.token.trim().slice(0, 300) : '';
  if (!businessId || token.length < 20) return NextResponse.json({ error: 'Cole o Access Token completo.' }, { status: 400 });

  const supa = supabaseServer();
  const { data: u } = await supa.auth.getUser();
  if (!u.user) return NextResponse.json({ error: 'Entre no painel novamente.' }, { status: 401 });

  const me = await mpFetch(token, '/users/me');
  if (!me.ok) return NextResponse.json({ error: 'O Mercado Pago não aceitou essa chave. Confira se copiou o Access Token de produção.' }, { status: 422 });

  const { error } = await supa.rpc('set_mp_token', { p_business: businessId, p_token: token, p_public_key: null });
  if (error) {
    const msg = /forbidden|42501/.test(error.message) ? 'Só o dono ou gerente pode conectar o pagamento.' : 'Rode o SQL 10 no Supabase para ativar o Pix.';
    return NextResponse.json({ error: msg }, { status: 403 });
  }
  return NextResponse.json({ ok: true, account: me.json?.nickname ?? me.json?.email ?? null });
}
