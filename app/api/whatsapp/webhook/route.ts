import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { runAgent } from '@/lib/agent';
import { markRead, sendText, transcribeAudio } from '@/lib/whatsapp';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Verificacao inicial do webhook pela Meta.
export async function GET(req: Request) {
  const u = new URL(req.url);
  const ok = u.searchParams.get('hub.mode') === 'subscribe' && !!process.env.WA_VERIFY_TOKEN && u.searchParams.get('hub.verify_token') === process.env.WA_VERIFY_TOKEN;
  return ok ? new Response(u.searchParams.get('hub.challenge') ?? '', { status: 200 }) : new Response('forbidden', { status: 403 });
}

function validSignature(raw: string, header: string | null) {
  const secret = process.env.WA_APP_SECRET;
  if (!secret) return true; // sem segredo configurado, aceita (recomendado configurar)
  if (!header?.startsWith('sha256=')) return false;
  const exp = crypto.createHmac('sha256', secret).update(raw).digest('hex');
  const got = header.slice(7);
  return got.length === exp.length && crypto.timingSafeEqual(Buffer.from(got), Buffer.from(exp));
}

export async function POST(req: Request) {
  const raw = await req.text();
  if (!validSignature(raw, req.headers.get('x-hub-signature-256'))) return new Response('forbidden', { status: 403 });
  let body: any;
  try { body = JSON.parse(raw); } catch { return NextResponse.json({ ok: true }); }

  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host') ?? '';
  const proto = req.headers.get('x-forwarded-proto') ?? 'https';
  const db = supabaseAdmin();

  for (const entry of body?.entry ?? []) {
    for (const ch of entry?.changes ?? []) {
      const v = ch?.value;
      const pid = String(v?.metadata?.phone_number_id ?? '');
      if (!pid || !Array.isArray(v?.messages)) continue;
      const { data: acc } = await db.rpc('get_wa_account', { p_phone_number_id: pid });
      const account = Array.isArray(acc) ? acc[0] : acc;
      if (!account?.token) continue;

      for (const m of v.messages) {
        try {
          const id = String(m?.id ?? '');
          const from = String(m?.from ?? '').replace(/\D/g, '');
          if (!id || !from) continue;
          const dup = await db.from('wa_processed').insert({ msg_id: id });
          if (dup.error) continue; // ja tratada (a Meta reenvia quando demora)
          const name = String((v.contacts ?? []).find((c: any) => c?.wa_id === from)?.profile?.name ?? '').slice(0, 80);
          const conv = await db.from('wa_conversations').upsert({ business_id: account.business_id, wa_phone: from, ...(name ? { customer_name: name } : {}), last_inbound_at: new Date().toISOString() }, { onConflict: 'business_id,wa_phone' }).select('id,history,bot_paused,customer_name,updated_at').single();
          if (conv.error || !conv.data) { console.error('wa conv', conv.error?.message); continue; }
          const convId = conv.data.id as string;
          const log = async (direction: 'in' | 'out_bot', body: string, unread?: boolean) => {
            const r = await db.from('wa_messages').insert({ business_id: account.business_id, conversation_id: convId, direction, body: body.slice(0, 4000) });
            if (r.error) return; // antes do SQL 13 a tabela nao existe: o atendente segue funcionando
            await db.from('wa_conversations').update({ last_message: body.slice(0, 200), last_message_at: new Date().toISOString(), ...(unread === undefined ? {} : { unread }) }).eq('id', convId);
          };

          let text = '';
          if (m.type === 'text') text = String(m.text?.body ?? '');
          else if (m.type === 'audio') {
            const t = await transcribeAudio(account.token, String(m.audio?.id ?? ''));
            if (!t) {
              await log('in', '🎤 (áudio que não foi possível ouvir)', true);
              if (account.bot_enabled && !conv.data.bot_paused) { await sendText(account.token, pid, from, 'Não consegui ouvir seu áudio 😕 Pode escrever sua mensagem?'); await log('out_bot', 'Não consegui ouvir seu áudio. Pode escrever sua mensagem?', true); }
              continue;
            }
            text = '🎤 ' + t;
          } else if (m.type === 'interactive') text = String(m.interactive?.button_reply?.title ?? m.interactive?.list_reply?.title ?? '');
          else {
            await log('in', `(mensagem do tipo ${String(m.type)})`, true);
            if (account.bot_enabled && !conv.data.bot_paused) await sendText(account.token, pid, from, 'Por enquanto eu só entendo texto e áudio 🙂 Me conta o que você quer pedir!');
            continue;
          }
          if (!text.trim()) continue;
          await log('in', text, true);

          if (!account.bot_enabled) continue; // so registra; a loja atende na mao
          // Um humano assumiu; se ninguem respondeu em 1 hora, o atendente volta sozinho.
          if (conv.data.bot_paused) {
            const stale = Date.now() - Date.parse(String(conv.data.updated_at ?? '')) > 60 * 60 * 1000;
            if (!stale) continue;
            await db.from('wa_conversations').update({ bot_paused: false }).eq('id', convId);
          }

          await markRead(account.token, pid, id);
          const userText = text.replace(/^🎤 /, '');

          let out;
          try {
            out = await runAgent({ businessId: account.business_id, phone: from, customerName: name || conv.data.customer_name || '', userText, history: Array.isArray(conv.data.history) ? conv.data.history : [], host, proto });
          } catch (e) {
            console.error('agent', e);
            await sendText(account.token, pid, from, 'Tive um probleminha aqui 😅 Pode repetir sua mensagem em instantes?');
            await log('out_bot', 'Tive um probleminha aqui. Pode repetir sua mensagem em instantes?', true);
            continue;
          }
          if (out.reply) { await sendText(account.token, pid, from, out.reply); await log('out_bot', out.reply, out.handoff); }
          for (const x of out.extra) { await sendText(account.token, pid, from, x); await log('out_bot', x, out.handoff); }
          await db.from('wa_conversations').update({ history: out.history, bot_paused: out.handoff || undefined, updated_at: new Date().toISOString() }).eq('id', convId);
        } catch (e) {
          console.error('wa message', e);
        }
      }
    }
  }
  return NextResponse.json({ ok: true });
}
