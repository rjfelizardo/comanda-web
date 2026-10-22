import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { sendText } from '@/lib/whatsapp';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Resposta manual do atendente humano. Pausa o robo naquela conversa.
export async function POST(req: Request) {
  let b: any;
  try { b = await req.json(); } catch { return NextResponse.json({ error: 'Requisição inválida.' }, { status: 400 }); }
  const convId = typeof b?.conversation_id === 'string' ? b.conversation_id.slice(0, 60) : '';
  const text = typeof b?.text === 'string' ? b.text.trim().slice(0, 1500) : '';
  if (!convId || !text) return NextResponse.json({ error: 'Escreva a mensagem.' }, { status: 400 });

  const supa = supabaseServer();
  const { data: u } = await supa.auth.getUser();
  if (!u.user) return NextResponse.json({ error: 'Entre no painel novamente.' }, { status: 401 });

  // A leitura passa pela regra do banco: so quem e da loja enxerga a conversa.
  const { data: conv } = await supa.from('wa_conversations').select('id,business_id,wa_phone').eq('id', convId).maybeSingle();
  if (!conv) return NextResponse.json({ error: 'Conversa não encontrada.' }, { status: 404 });

  const db = supabaseAdmin();
  const { data: acc } = await db.from('wa_accounts').select('phone_number_id').eq('business_id', conv.business_id).eq('status', 'active').maybeSingle();
  if (!acc) return NextResponse.json({ error: 'WhatsApp não conectado.' }, { status: 409 });
  const { data: sec } = await db.rpc('get_wa_account', { p_phone_number_id: acc.phone_number_id });
  const row = Array.isArray(sec) ? sec[0] : sec;
  if (!row?.token) return NextResponse.json({ error: 'Token não encontrado.' }, { status: 409 });

  const ok = await sendText(row.token, acc.phone_number_id, conv.wa_phone, text);
  if (!ok) return NextResponse.json({ error: 'A Meta não entregou. Se o cliente não fala com a loja há mais de 24 horas, o WhatsApp bloqueia mensagem livre.' }, { status: 502 });

  await db.from('wa_messages').insert({ business_id: conv.business_id, conversation_id: conv.id, direction: 'out_human', body: text });
  await db.from('wa_conversations').update({ bot_paused: true, unread: false, last_message: text.slice(0, 200), last_message_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', conv.id);
  return NextResponse.json({ ok: true });
}
