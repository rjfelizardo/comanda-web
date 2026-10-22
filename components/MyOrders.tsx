'use client';

import { useCallback, useEffect, useState } from 'react';
import { brl } from '@/lib/format';

type Entry = { code: string; phone: string };
type Order = {
  code: string; status: string; fulfillment: 'delivery' | 'pickup'; payment_method: string; payment_status: string;
  total: number; created_at: string; items: { name: string; quantity: number; options: string[] }[];
};

export const ordersKey = (businessId: string) => `comanda-pedidos-${businessId}`;

export function readEntries(businessId: string): Entry[] {
  try {
    const v = JSON.parse(localStorage.getItem(ordersKey(businessId)) || '[]');
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}
export function saveEntry(businessId: string, e: Entry) {
  try {
    const rest = readEntries(businessId).filter((x) => x.code !== e.code);
    localStorage.setItem(ordersKey(businessId), JSON.stringify([e, ...rest].slice(0, 20)));
  } catch {}
}

const STEPS_DELIVERY = ['Recebido', 'Em preparo', 'Saiu para entrega', 'Entregue'];
const STEPS_PICKUP = ['Recebido', 'Em preparo', 'Pronto para retirar', 'Retirado'];

function stepIndex(status: string, f: string) {
  const map: Record<string, number> = {
    pending_approval: 0, approved: 1, awaiting_payment: 0, paid: 1, in_preparation: 1, ready: 2, out_for_delivery: 2, delivered: 3,
  };
  const i = map[status] ?? 0;
  return f === 'pickup' && status === 'out_for_delivery' ? 2 : i;
}

const HEADLINE: Record<string, string> = {
  pending_approval: 'Aguardando a loja confirmar',
  approved: 'Pedido confirmado',
  awaiting_payment: 'Aguardando pagamento',
  paid: 'Pagamento confirmado',
  in_preparation: 'Em preparo',
  ready: 'Pronto!',
  out_for_delivery: 'Saiu para entrega',
  delivered: 'Entregue. Bom apetite!',
  rejected: 'A loja não pôde aceitar este pedido',
  cancelled: 'Pedido cancelado',
};

export default function MyOrders({ businessId, whatsapp, onClose }: { businessId: string; whatsapp: string | null; onClose: () => void }) {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [err, setErr] = useState('');
  const [code, setCode] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const entries = readEntries(businessId);
    if (entries.length === 0) return setOrders([]);
    try {
      const r = await fetch('/api/orders/track', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ business_id: businessId, entries }),
      });
      const d = await r.json().catch(() => ({}));
      if (r.ok) { setOrders(d.orders ?? []); setErr(''); } else setErr(d.error || 'Não foi possível atualizar.');
    } catch {
      setErr('Sem conexão. Tente novamente.');
    }
  }, [businessId]);

  useEffect(() => {
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  async function find(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    setBusy(true);
    try {
      const r = await fetch('/api/orders/track', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ business_id: businessId, entries: [{ code, phone }] }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) setErr(d.error || 'Não foi possível buscar.');
      else if ((d.orders ?? []).length === 0) setErr('Não encontramos esse pedido. Confira o código e o WhatsApp usado.');
      else { saveEntry(businessId, { code: code.replace(/\D/g, ''), phone }); setCode(''); setPhone(''); await load(); }
    } catch {
      setErr('Sem conexão. Tente novamente.');
    }
    setBusy(false);
  }

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-ink/50 sm:items-center" onClick={onClose}>
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white px-4 pt-4 sm:rounded-3xl" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Meus pedidos">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-xl font-extrabold">Meus pedidos</h2>
          <button onClick={onClose} className="h-10 w-10 rounded-full bg-sand text-lg" aria-label="Fechar">✕</button>
        </div>
        <div className="grid gap-4 pb-6">
          {orders === null && <p className="py-6 text-center text-ink/60">Carregando…</p>}
          {orders?.length === 0 && <p className="rounded-xl bg-sand/60 p-3 text-sm text-ink/70">Nenhum pedido neste aparelho ainda. Se você já pediu em outro aparelho, busque abaixo pelo código.</p>}
          {orders?.map((o) => {
            const steps = o.fulfillment === 'pickup' ? STEPS_PICKUP : STEPS_DELIVERY;
            const idx = stepIndex(o.status, o.fulfillment);
            const dead = o.status === 'rejected' || o.status === 'cancelled';
            return (
              <article key={o.code} className="rounded-2xl border border-sand p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-display text-lg font-extrabold tracking-widest">#{o.code}</p>
                    <p className="text-xs text-ink/60">{new Date(o.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })} · {o.fulfillment === 'pickup' ? 'Retirada' : 'Entrega'}</p>
                  </div>
                  <p className="font-bold">{brl(o.total)}</p>
                </div>
                <p className={`mt-2 rounded-xl p-2 text-sm font-semibold ${dead ? 'bg-red-50 text-red-800' : 'bg-brand-sun/40'}`}>{HEADLINE[o.status] ?? o.status}</p>
                {!dead && (
                  <ol className="mt-3 flex gap-1">
                    {steps.map((s, i) => (
                      <li key={s} className="flex-1 text-center">
                        <div className={`h-1.5 rounded-full ${i <= idx ? 'bg-brand' : 'bg-sand'}`} />
                        <p className={`mt-1 text-[11px] leading-tight ${i <= idx ? 'font-semibold' : 'text-ink/50'}`}>{s}</p>
                      </li>
                    ))}
                  </ol>
                )}
                <ul className="mt-3 text-sm text-ink/70">
                  {o.items.map((i, k) => (
                    <li key={k}>{i.quantity}× {i.name}{i.options.length > 0 && <span className="text-ink/50"> ({i.options.join(', ')})</span>}</li>
                  ))}
                </ul>
                {whatsapp && (
                  <a className="mt-3 inline-block text-sm font-semibold underline" target="_blank" rel="noreferrer"
                    href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(`Olá! Sobre o pedido ${o.code}.`)}`}>Falar com a loja</a>
                )}
              </article>
            );
          })}

          <form onSubmit={find} className="rounded-2xl bg-sand/50 p-3">
            <p className="text-sm font-bold">Buscar outro pedido</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <input className="input" inputMode="numeric" placeholder="Código" value={code} onChange={(e) => setCode(e.target.value)} />
              <input className="input" inputMode="tel" placeholder="Seu WhatsApp" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <button className="btn-ghost btn-sm mt-2" disabled={busy || !code || !phone}>{busy ? 'Buscando…' : 'Buscar'}</button>
          </form>
          {err && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{err}</p>}
        </div>
      </div>
    </div>
  );
}
