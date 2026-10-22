'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';

type Conv = { id: string; wa_phone: string; customer_name: string | null; bot_paused: boolean; unread: boolean; last_message: string | null; last_message_at: string | null };
type Msg = { id: number; direction: 'in' | 'out_bot' | 'out_human'; body: string; created_at: string };

const hhmm = (iso: string | null) => (iso ? new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Bahia' }) : '');
const dia = (iso: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  const hoje = new Date();
  return d.toDateString() === hoje.toDateString() ? hhmm(iso) : d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'America/Bahia' });
};
const fmtPhone = (p: string) => (p.length >= 12 ? `+${p.slice(0, 2)} ${p.slice(2, 4)} ${p.slice(4, -4)}-${p.slice(-4)}` : p);

export default function ConversationsBoard({ businessId }: { businessId: string }) {
  const [convs, setConvs] = useState<Conv[] | null>(null);
  const [missing, setMissing] = useState(false);
  const [sel, setSel] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [onlyHuman, setOnlyHuman] = useState(false);
  const [q, setQ] = useState('');
  const endRef = useRef<HTMLDivElement>(null);
  const selRef = useRef<string | null>(null);
  selRef.current = sel;

  const loadConvs = useCallback(async () => {
    const { data, error } = await supabaseBrowser()
      .from('wa_conversations')
      .select('id,wa_phone,customer_name,bot_paused,unread,last_message,last_message_at')
      .eq('business_id', businessId)
      .order('last_message_at', { ascending: false, nullsFirst: false })
      .limit(100);
    if (error) { setMissing(true); setConvs([]); return; }
    setConvs((data ?? []) as Conv[]);
  }, [businessId]);

  const loadMsgs = useCallback(async (id: string) => {
    const { data } = await supabaseBrowser().from('wa_messages').select('id,direction,body,created_at').eq('conversation_id', id).order('id', { ascending: true }).limit(300);
    if (selRef.current === id) setMsgs((data ?? []) as Msg[]);
  }, []);

  useEffect(() => {
    loadConvs();
    const t = setInterval(() => { loadConvs(); if (selRef.current) loadMsgs(selRef.current); }, 5000);
    return () => clearInterval(t);
  }, [loadConvs, loadMsgs]);

  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }); }, [msgs.length, sel]);

  async function open(id: string) {
    setSel(id); setMsgs([]); setErr('');
    await loadMsgs(id);
    await supabaseBrowser().rpc('mark_wa_read', { p_conversation: id });
    loadConvs();
  }

  async function send() {
    if (!sel || !text.trim()) return;
    setBusy(true); setErr('');
    try {
      const res = await fetch('/api/wa/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ conversation_id: sel, text }) });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) setErr(j.error || 'Não foi possível enviar.');
      else { setText(''); await loadMsgs(sel); loadConvs(); }
    } catch { setErr('Sem conexão.'); }
    setBusy(false);
  }

  async function setBot(paused: boolean) {
    if (!sel) return;
    const { error } = await supabaseBrowser().rpc('set_wa_conversation_bot', { p_conversation: sel, p_paused: paused });
    if (error) return setErr('Rode o SQL 13 no Supabase para usar esta tela.');
    loadConvs();
  }

  if (convs === null) return <p className="py-10 text-center text-ink/50">Carregando…</p>;
  if (missing) return <p className="card p-4 text-sm">Rode o <b>SQL 13</b> no Supabase para ativar a tela de conversas.</p>;

  const list = convs.filter((c) => (!onlyHuman || c.bot_paused) && (!q.trim() || `${c.customer_name ?? ''} ${c.wa_phone}`.toLowerCase().includes(q.trim().toLowerCase())));
  const cur = convs.find((c) => c.id === sel) ?? null;

  return (
    <div>
      <h1 className="mb-3 font-display text-2xl font-extrabold">Conversas do WhatsApp</h1>
      <div className="card grid min-h-[70vh] overflow-hidden md:grid-cols-[20rem_1fr]">
        <aside className={`border-sand md:border-r ${sel ? 'hidden md:block' : ''}`}>
          <div className="space-y-2 border-b border-sand p-3">
            <input className="input !py-2 text-sm" placeholder="Buscar por nome ou número" value={q} onChange={(e) => setQ(e.target.value)} />
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={onlyHuman} onChange={(e) => setOnlyHuman(e.target.checked)} /> Só os que precisam de atendente</label>
          </div>
          <div className="max-h-[62vh] overflow-y-auto">
            {list.length === 0 && <p className="p-4 text-sm text-ink/50">Nenhuma conversa ainda.</p>}
            {list.map((c) => (
              <button key={c.id} onClick={() => open(c.id)} className={`block w-full border-b border-sand/70 px-3 py-3 text-left hover:bg-sand/40 ${sel === c.id ? 'bg-sand/60' : ''}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className={`truncate text-sm ${c.unread ? 'font-extrabold' : 'font-semibold'}`}>{c.customer_name || fmtPhone(c.wa_phone)}</span>
                  <span className="shrink-0 text-xs text-ink/50">{dia(c.last_message_at)}</span>
                </div>
                <div className="mt-0.5 flex items-center gap-2">
                  <span className="truncate text-xs text-ink/60">{c.last_message ?? ''}</span>
                  {c.bot_paused && <span className="chip shrink-0 bg-amber-100 text-amber-800">Atendente</span>}
                  {c.unread && <span className="ml-auto h-2.5 w-2.5 shrink-0 rounded-full bg-brand" />}
                </div>
              </button>
            ))}
          </div>
        </aside>

        <section className={`flex min-h-[70vh] flex-col ${sel ? '' : 'hidden md:flex'}`}>
          {!cur ? (
            <p className="m-auto p-6 text-sm text-ink/50">Escolha uma conversa.</p>
          ) : (
            <>
              <div className="flex items-center gap-3 border-b border-sand p-3">
                <button className="text-sm font-semibold text-brand-dark underline md:hidden" onClick={() => setSel(null)}>← Voltar</button>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold">{cur.customer_name || fmtPhone(cur.wa_phone)}</p>
                  <p className="text-xs text-ink/50">{fmtPhone(cur.wa_phone)}</p>
                </div>
                {cur.bot_paused ? (
                  <button className="btn-primary btn-sm" onClick={() => setBot(false)}>Devolver ao robô</button>
                ) : (
                  <button className="btn-ghost btn-sm" onClick={() => setBot(true)}>Assumir conversa</button>
                )}
              </div>
              <div className="flex-1 space-y-2 overflow-y-auto bg-sand/30 p-3" style={{ maxHeight: '55vh' }}>
                {msgs.map((m) => (
                  <div key={m.id} className={`flex ${m.direction === 'in' ? 'justify-start' : 'justify-end'}`}>
                    <div className={`max-w-[80%] whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-sm shadow-card ${m.direction === 'in' ? 'bg-white' : m.direction === 'out_human' ? 'bg-brand-sun/60' : 'bg-green-100'}`}>
                      {m.direction !== 'in' && <p className="mb-0.5 text-[10px] font-bold uppercase tracking-wide text-ink/50">{m.direction === 'out_bot' ? 'Robô' : 'Atendente'}</p>}
                      {m.body}
                      <p className="mt-1 text-right text-[10px] text-ink/40">{hhmm(m.created_at)}</p>
                    </div>
                  </div>
                ))}
                <div ref={endRef} />
              </div>
              {err && <p className="px-3 pt-2 text-sm text-red-700">{err}</p>}
              <div className="flex gap-2 border-t border-sand p-3">
                <input className="input" placeholder="Digite a resposta…" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} />
                <button className="btn-primary shrink-0" disabled={busy || !text.trim()} onClick={send}>{busy ? '…' : 'Enviar'}</button>
              </div>
              <p className="px-3 pb-2 text-xs text-ink/50">Ao responder, o robô pausa nesta conversa. Clique em “Devolver ao robô” quando terminar.</p>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
