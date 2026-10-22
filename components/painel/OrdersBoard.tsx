'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { brl, STATUS_LABEL } from '@/lib/format';
import { printOrder } from '@/lib/printOrder';

type Item = { id: string; order_id: string; product_name: string; quantity: number; options: any[]; notes: string | null };
type Order = {
  id: string; code: string; status: string; fulfillment: string; customer_name: string; customer_phone: string;
  total: number; subtotal: number; delivery_fee: number; payment_method: string; payment_status: string;
  address: any; notes: string | null; change_for: number | null; created_at: string; items: Item[];
  discount?: number; scheduled_for?: string | null; coupon_code?: string | null;
};

const ACTIVE = ['pending_approval', 'approved', 'awaiting_payment', 'paid', 'in_preparation', 'ready', 'out_for_delivery'];

export default function OrdersBoard({ businessId, businessName }: { businessId: string; businessName: string }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [tab, setTab] = useState<'active' | 'done'>('active');
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const known = useRef<Set<string>>(new Set());
  const first = useRef(true);
  const [soundOn, setSoundOn] = useState(false);

  const load = useCallback(async () => {
    const supabase = supabaseBrowser();
    const since = new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString();
    const { data: os, error } = await supabase
      .from('orders')
      .select('id,code,status,fulfillment,customer_name,customer_phone,total,subtotal,delivery_fee,payment_method,payment_status,address,notes,change_for,created_at,discount,coupon_code,scheduled_for')
      .eq('business_id', businessId)
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(150);
    if (error) {
      setError('Não foi possível carregar os pedidos.');
      setLoading(false);
      return;
    }
    const list = (os ?? []) as any[];
    let items: Item[] = [];
    if (list.length) {
      const { data } = await supabase
        .from('order_items')
        .select('id,order_id,product_name,quantity,options,notes')
        .in('order_id', list.map((o) => o.id));
      items = (data ?? []) as Item[];
    }
    const merged: Order[] = list.map((o) => ({
      ...o,
      total: Number(o.total), subtotal: Number(o.subtotal), delivery_fee: Number(o.delivery_fee), discount: Number(o.discount ?? 0),
      items: items.filter((i) => i.order_id === o.id),
    }));
    const fresh = merged.filter((o) => !known.current.has(o.id) && o.status === 'pending_approval');
    if (!first.current && fresh.length) beep();
    merged.forEach((o) => known.current.add(o.id));
    first.current = false;
    setOrders(merged);
    setError('');
    setLoading(false);
  }, [businessId]);

  useEffect(() => {
    known.current = new Set();
    first.current = true;
    load();
    const supabase = supabaseBrowser();
    const channel = supabase
      .channel(`orders-${businessId}`)
      .on('postgres_changes', { event: '*', schema: 'comanda', table: 'orders', filter: `business_id=eq.${businessId}` }, () => load())
      .subscribe();
    const poll = setInterval(load, 20000);
    return () => {
      clearInterval(poll);
      supabase.removeChannel(channel);
    };
  }, [businessId, load]);

  async function move(o: Order, status: string, chain?: string) {
    setBusyId(o.id);
    setError('');
    const supabase = supabaseBrowser();
    let r = await supabase.rpc('set_order_status', { p_order_id: o.id, p_status: status });
    if (!r.error && chain) r = await supabase.rpc('set_order_status', { p_order_id: o.id, p_status: chain });
    if (r.error) setError('Não foi possível atualizar: ' + r.error.message.replace('invalid_transition: ', 'transição inválida '));
    await load();
    setBusyId('');
  }

  useEffect(() => {
    try { if (localStorage.getItem('comanda-sound') === '1') setSoundOn(true); } catch {}
    // O navegador so libera o som depois de um toque na pagina: libera no primeiro toque.
    const unlock = () => unlockAudio();
    window.addEventListener('pointerdown', unlock, { once: true });
    return () => window.removeEventListener('pointerdown', unlock);
  }, []);

  const novosCount = orders.filter((o) => o.status === 'pending_approval').length;
  useEffect(() => {
    // Enquanto houver pedido novo sem resposta, repete o aviso a cada 10s.
    if (!soundOn || novosCount === 0) return;
    const t = setInterval(beep, 10000);
    return () => clearInterval(t);
  }, [soundOn, novosCount]);

  function toggleSound() {
    const next = !soundOn;
    setSoundOn(next);
    try { localStorage.setItem('comanda-sound', next ? '1' : '0'); } catch {}
    if (next) { unlockAudio(); beep(); }
  }

  const shown = orders.filter((o) => (tab === 'active' ? ACTIVE.includes(o.status) : !ACTIVE.includes(o.status)));
  const novos = orders.filter((o) => o.status === 'pending_approval').length;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-extrabold">Pedidos</h1>
          <button onClick={toggleSound} className={`rounded-full px-3 py-1.5 text-sm font-semibold ${soundOn ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {soundOn ? '🔔 Som ligado' : '🔇 Ativar som'}
          </button>
        </div>
        <div className="flex rounded-full bg-sand p-1 text-sm font-semibold">
          <button onClick={() => setTab('active')} className={`rounded-full px-4 py-1.5 ${tab === 'active' ? 'bg-white shadow-card' : 'text-ink/60'}`}>
            Em andamento{novos > 0 && <span className="ml-1.5 rounded-full bg-brand px-1.5 text-xs text-white">{novos}</span>}
          </button>
          <button onClick={() => setTab('done')} className={`rounded-full px-4 py-1.5 ${tab === 'done' ? 'bg-white shadow-card' : 'text-ink/60'}`}>Finalizados</button>
        </div>
      </div>

      {error && <p role="alert" className="mb-3 rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {loading && <p className="py-10 text-center text-ink/50">Carregando…</p>}
      {!loading && shown.length === 0 && (
        <div className="card p-10 text-center text-ink/60">
          {tab === 'active' ? 'Nenhum pedido em andamento. Quando chegar um, ele aparece aqui na hora.' : 'Nenhum pedido finalizado nos últimos 3 dias.'}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {shown.map((o) => (
          <article key={o.id} className={`card p-4 ${o.status === 'pending_approval' ? 'ring-2 ring-brand' : ''}`}>
            <header className="flex items-start justify-between gap-2">
              <div>
                <p className="font-display text-xl font-extrabold">#{o.code}</p>
                <p className="text-sm text-ink/60">{new Date(o.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => printOrder(businessName, o)} className="rounded-full bg-sand px-3 py-1 text-xs font-semibold" aria-label="Imprimir pedido">🖨 Imprimir</button>
                <span className={`chip ${badge(o.status)}`}>{STATUS_LABEL[o.status] ?? o.status}</span>
              </div>
            </header>

            <p className="mt-3 font-semibold">{o.customer_name}</p>
            <a className="text-sm text-brand-dark underline" target="_blank" rel="noreferrer" href={`https://wa.me/${o.customer_phone}`}>
              {o.customer_phone}
            </a>
            <p className="mt-1 text-sm">{o.fulfillment === 'delivery' ? '🛵 Entrega' : '🏪 Retirada'}</p>
            {o.scheduled_for && (
              <p className="mt-1 rounded-lg bg-brand-sun/40 px-2 py-1 text-sm font-bold">🕒 Agendado para {new Date(o.scheduled_for).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</p>
            )}
            {o.fulfillment === 'delivery' && o.address && (
              <p className="text-sm text-ink/70">
                {[o.address.street, o.address.number, o.address.neighborhood].filter(Boolean).join(', ')}
                {o.address.complement ? ` — ${o.address.complement}` : ''}
                {o.address.reference ? ` (ref.: ${o.address.reference})` : ''}
              </p>
            )}

            <ul className="mt-3 space-y-1.5 border-t border-sand pt-3 text-sm">
              {o.items.map((i) => (
                <li key={i.id}>
                  <strong>{i.quantity}×</strong> {i.product_name}
                  {i.options?.length > 0 && <span className="text-ink/60"> — {i.options.map((x: any) => x.name).join(', ')}</span>}
                  {i.notes && <span className="block italic text-ink/60">“{i.notes}”</span>}
                </li>
              ))}
            </ul>
            {o.notes && <p className="mt-2 rounded-lg bg-brand-sun/30 p-2 text-sm">Obs.: {o.notes}</p>}

            <div className="mt-3 flex items-end justify-between border-t border-sand pt-3 text-sm">
              <div className="text-ink/60">
                <p>{o.payment_method === 'online' ? 'Pagamento online' : 'Pagar na ' + (o.fulfillment === 'delivery' ? 'entrega' : 'retirada')}</p>
                {o.change_for ? <p>Troco para {brl(o.change_for)}</p> : null}
                {o.delivery_fee > 0 && <p>Entrega {brl(o.delivery_fee)}</p>}
                {(o.discount ?? 0) > 0 && <p className="text-green-700">Cupom {o.coupon_code}: − {brl(o.discount as number)}</p>}
              </div>
              <p className="text-xl font-extrabold">{brl(o.total)}</p>
            </div>

            <Actions o={o} busy={busyId === o.id} onMove={move} />
          </article>
        ))}
      </div>
    </div>
  );
}

function Actions({ o, busy, onMove }: { o: Order; busy: boolean; onMove: (o: Order, s: string, chain?: string) => void }) {
  const b = (label: string, status: string, cls = 'btn-primary', chain?: string) => (
    <button key={label} disabled={busy} className={`${cls} btn-sm flex-1`} onClick={() => onMove(o, status, chain)}>{label}</button>
  );
  const cancel = (
    <button key="cancel" disabled={busy} className="btn-danger btn-sm" onClick={() => confirm('Cancelar este pedido?') && onMove(o, 'cancelled')}>Cancelar</button>
  );
  let btns: React.ReactNode[] = [];
  switch (o.status) {
    case 'pending_approval':
      btns = [
        b('Aceitar e preparar', 'approved', 'btn-primary', 'in_preparation'),
        <button key="rej" disabled={busy} className="btn-danger btn-sm" onClick={() => confirm('Recusar este pedido?') && onMove(o, 'rejected')}>Recusar</button>,
      ];
      break;
    case 'approved':
    case 'paid':
      btns = [b('Iniciar preparo', 'in_preparation'), cancel];
      break;
    case 'in_preparation':
      btns = [b('Pronto', 'ready'), cancel];
      break;
    case 'ready':
      btns = [o.fulfillment === 'delivery' ? b('Saiu para entrega', 'out_for_delivery') : b('Entregue', 'delivered'), cancel];
      break;
    case 'out_for_delivery':
      btns = [b('Entregue', 'delivered'), cancel];
      break;
    case 'awaiting_payment':
      btns = [cancel];
      break;
  }
  if (!btns.length) return null;
  return <div className="mt-3 flex gap-2">{btns}</div>;
}

function badge(s: string) {
  if (s === 'pending_approval') return 'bg-brand text-white';
  if (['delivered'].includes(s)) return 'bg-green-100 text-green-800';
  if (['rejected', 'cancelled'].includes(s)) return 'bg-red-100 text-red-800';
  return 'bg-brand-sun/40 text-ink';
}

let audioCtx: AudioContext | null = null;
function unlockAudio() {
  try {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    if (!audioCtx) audioCtx = new Ctx();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx.state !== 'closed';
  } catch {
    return false;
  }
}

function beep() {
  try {
    if (!unlockAudio() || !audioCtx) return;
    const ctx = audioCtx;
    [0, 0.3, 0.6].forEach((t, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'square';
      o.frequency.value = i === 2 ? 1175 : 880;
      o.connect(g);
      g.connect(ctx.destination);
      g.gain.setValueAtTime(0.0001, ctx.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.35, ctx.currentTime + t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t + 0.24);
      o.start(ctx.currentTime + t);
      o.stop(ctx.currentTime + t + 0.26);
    });
  } catch {}
}
