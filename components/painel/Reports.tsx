'use client';

import { useEffect, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { brl } from '@/lib/format';

type Row = { id: string; status: string; fulfillment: string; payment_method: string; total: number; created_at: string };
const DONE_BAD = ['rejected', 'cancelled'];

export default function Reports({ businessId }: { businessId: string }) {
  const [days, setDays] = useState(7);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [top, setTop] = useState<{ name: string; qty: number; total: number }[]>([]);
  const [err, setErr] = useState('');

  useEffect(() => {
    let alive = true;
    (async () => {
      setRows(null); setErr('');
      const s = supabaseBrowser();
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      start.setDate(start.getDate() - (days - 1));
      const { data, error } = await s
        .from('orders')
        .select('id,status,fulfillment,payment_method,total,created_at')
        .eq('business_id', businessId)
        .gte('created_at', start.toISOString())
        .order('created_at', { ascending: false })
        .limit(2000);
      if (!alive) return;
      if (error) { setErr('Não foi possível carregar os relatórios.'); return; }
      const list = ((data ?? []) as any[]).map((o) => ({ ...o, total: Number(o.total) })) as Row[];
      setRows(list);
      const ok = list.filter((o) => !DONE_BAD.includes(o.status));
      const agg = new Map<string, { name: string; qty: number; total: number }>();
      for (let i = 0; i < ok.length; i += 150) {
        const ids = ok.slice(i, i + 150).map((o) => o.id);
        const { data: its } = await s.from('order_items').select('product_name,quantity,subtotal').in('order_id', ids);
        ((its ?? []) as any[]).forEach((x) => {
          const cur = agg.get(x.product_name) ?? { name: x.product_name, qty: 0, total: 0 };
          cur.qty += x.quantity; cur.total += Number(x.subtotal);
          agg.set(x.product_name, cur);
        });
      }
      if (alive) setTop(Array.from(agg.values()).sort((a, b) => b.qty - a.qty).slice(0, 10));
    })();
    return () => { alive = false; };
  }, [businessId, days]);

  const ok = (rows ?? []).filter((o) => !DONE_BAD.includes(o.status));
  const lost = (rows ?? []).length - ok.length;
  const revenue = ok.reduce((n, o) => n + o.total, 0);
  const ticket = ok.length ? revenue / ok.length : 0;
  const delivery = ok.filter((o) => o.fulfillment === 'delivery').length;

  const perDay = new Map<string, number>();
  ok.forEach((o) => {
    const k = new Date(o.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    perDay.set(k, (perDay.get(k) ?? 0) + o.total);
  });
  const dayList = Array.from(perDay.entries()).reverse();
  const maxDay = Math.max(1, ...dayList.map(([, v]) => v));
  const perHour = new Array(24).fill(0);
  ok.forEach((o) => { perHour[new Date(o.created_at).getHours()]++; });
  const maxHour = Math.max(1, ...perHour);

  return (
    <div className="grid gap-5 pb-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold">Relatórios</h1>
        <div className="flex rounded-full bg-sand p-1 text-sm font-semibold">
          {[[1, 'Hoje'], [7, '7 dias'], [30, '30 dias']].map(([d, l]) => (
            <button key={d} onClick={() => setDays(d as number)} className={`rounded-full px-4 py-1.5 ${days === d ? 'bg-white shadow-card' : 'text-ink/60'}`}>{l}</button>
          ))}
        </div>
      </div>
      {err && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{err}</p>}
      {rows === null && !err && <p className="py-10 text-center text-ink/50">Carregando…</p>}
      {rows !== null && (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              ['Vendas', brl(revenue)],
              ['Pedidos', String(ok.length)],
              ['Ticket médio', brl(ticket)],
              ['Cancelados/recusados', String(lost)],
            ].map(([l, v]) => (
              <div key={l} className="card p-4"><p className="text-sm text-ink/60">{l}</p><p className="mt-1 text-2xl font-extrabold">{v}</p></div>
            ))}
          </div>
          <div className="card p-4 text-sm">
            <p className="font-bold">Como seus clientes pedem</p>
            <p className="mt-1 text-ink/70">🛵 Entrega: {delivery} · 🏪 Retirada: {ok.length - delivery}</p>
          </div>
          {ok.length === 0 ? (
            <div className="card p-10 text-center text-ink/60">Nenhuma venda neste período.</div>
          ) : (
            <>
              {days > 1 && (
                <div className="card p-4">
                  <p className="mb-3 font-bold">Vendas por dia</p>
                  <div className="grid gap-1.5">
                    {dayList.map(([d, v]) => (
                      <div key={d} className="flex items-center gap-3 text-sm">
                        <span className="w-12 text-ink/60">{d}</span>
                        <div className="h-4 flex-1 rounded-full bg-sand"><div className="h-4 rounded-full bg-brand" style={{ width: `${(v / maxDay) * 100}%` }} /></div>
                        <span className="w-24 text-right font-semibold">{brl(v)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="card p-4">
                <p className="mb-3 font-bold">Mais vendidos</p>
                <ol className="divide-y divide-sand text-sm">
                  {top.map((t, i) => (
                    <li key={t.name} className="flex items-center justify-between py-2">
                      <span><b className="mr-2 text-ink/40">{i + 1}</b>{t.name}</span>
                      <span className="text-ink/70">{t.qty} un. · {brl(t.total)}</span>
                    </li>
                  ))}
                </ol>
              </div>
              <div className="card p-4">
                <p className="mb-3 font-bold">Horários de pico (pedidos por hora)</p>
                <div className="flex h-24 items-end gap-1">
                  {perHour.map((n, h) => (
                    <div key={h} className="flex flex-1 flex-col items-center justify-end" title={`${h}h: ${n}`}>
                      <div className="w-full rounded-t bg-brand" style={{ height: `${(n / maxHour) * 100}%`, minHeight: n ? 3 : 0 }} />
                    </div>
                  ))}
                </div>
                <div className="mt-1 flex justify-between text-[11px] text-ink/50"><span>0h</span><span>6h</span><span>12h</span><span>18h</span><span>23h</span></div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
