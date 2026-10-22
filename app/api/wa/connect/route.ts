import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { checkNumber } from '@/lib/whatsapp';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Valida o token na Meta e guarda no Vault (so dono/gerente; a regra esta no banco).
export async function POST(req: Request) {
  let b: any;
  try { b = await req.json(); } catch { return NextResponse.json({ error: 'Requisição inválida.' }, { status: 400 }); }
  const businessId = typeof b?.business_id === 'string' ? b.business_id.slice(0, 60) : '';
  const phoneId = typeof b?.phone_number_id === 'string' ? b.phone_number_id.replace(/\D/g, '').slice(0, 25) : '';
  const wabaId = typeof b?.waba_id === 'string' ? b.waba_id.replace(/\D/g, '').slice(0, 25) : '';
  const token = typeof b?.token === 'string' ? b.token.trim().slice(0, 600) : '';
  if (!businessId || phoneId.length < 6 || token.length < 20) return NextResponse.json({ error: 'Preencha o ID do número e o token.' }, { status: 400 });

  const supa = supabaseServer();
  const { data: u } = await supa.auth.getUser();
  if (!u.user) return NextResponse.json({ error: 'Entre no painel novamente.' }, { status: 401 });

  const info = await checkNumber(token, phoneId);
  if (!info) return NextResponse.json({ error: 'A Meta não aceitou. Confira o ID do número e o token permanente.' }, { status: 422 });

  const { error } = await supa.rpc('set_wa_account', { p_business: businessId, p_phone_number_id: phoneId, p_waba_id: wabaId || null, p_token: token, p_display_phone: info.display || null });
  if (error) {
    const m = error.message || '';
    const msg = /phone_in_use/.test(m) ? 'Esse número já está conectado a outra loja.' : /forbidden|42501/.test(m) ? 'Só o dono ou gerente pode conectar o WhatsApp.' : 'Rode o SQL 12 no Supabase para ativar o atendente.';
    return NextResponse.json({ error: msg }, { status: 403 });
  }
  return NextResponse.json({ ok: true, number: info.display, name: info.name });
}
