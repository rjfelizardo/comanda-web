'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { BillingModal, SUB_LABEL, dt, money, adminError, type Billing } from './shared';

type Row = Billing & { slug: string; status: string };

export default function Financeiro() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [editing, setEditing] = useState<Row | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabaseBrowser().rpc('admin_list_businesses');
    if (error) { setError(adminError(error.message)); return; }
    setError('');
    setRows(((data ?? []) as any[]).map((r) => ({ ...r, monthly_price: Number(r.monthly_price ?? 0) })) as Row[]);
  }, []);
  useEffect(() => { load(); }, [load]);

  const shown = useMemo(() => (rows ?? []).filter((r) => filter === 'all' || (r.subscription_status ?? 'trial') === filter), [rows, filter]);
  const mrr = useMemo(() => (rows ?? []).filter((r) => r.subscription_status === 'active').reduce((a, r) => a + (r.monthly_price ?? 0), 0), [rows]);
  const count = (s: string) => (rows ?? []).filter((r) => (r.subscription_status ?? 'trial') === s).length;
  const late = (r: Row) => r.subscription_status !== 'canceled' && r.next_due_at && new Date(r.next_due_at + 'T23:59:59') < new Date();

  if (error) return <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-800">{error}</p>;
  if (!rows) return <p className="py-10 text-center text-ink/50">Carregando…</p>;

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
      <div>
        <h1 className="text-2xl font-extrabold">Financeiro</h1>
        <p className="text-sm text-ink/60">
          Receita mensal das assinaturas em dia: <b className="text-ink">{money(mrr)}</b> · {count('active')} em dia · {count('trial')} em teste · {count('past_due')} atrasadas · {count('canceled')} canceladas
        </p>
      </div>
      <select className="input sm:max-w-[14rem]" value={filter} onChange={(e) => setFilter(e.target.value)}>
        <option value="all">Todas as situações</option>
        {Object.entries(SUB_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
      </select>

      <div className="overflow-hidden rounded-2xl bg-white shadow-card">
        <div className="hidden grid-cols-[2fr_1fr_1fr_1fr_1.2fr] gap-3 border-b border-sand bg-cream px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-ink/50 md:grid">
          <span>Loja</span><span>Plano</span><span>Valor mensal</span><span>Vencimento</span><span>Situação</span>
        </div>
        {shown.length === 0 && <p className="p-8 text-center text-ink/60">Nenhuma loja nesta situação.</p>}
        {shown.map((r) => (
          <button key={r.id} onClick={() => setEditing(r)} className="grid w-full grid-cols-2 items-center gap-x-3 gap-y-1 border-b border-sand px-4 py-3 text-left last:border-0 hover:bg-cream md:grid-cols-[2fr_1fr_1fr_1fr_1.2fr]">
            <span className="col-span-2 min-w-0 break-words font-bold md:col-span-1">{r.name}</span>
            <span className="text-sm text-ink/70"><span className="md:hidden">Plano: </span>{r.plan ?? 'trial'}</span>
            <span className="text-sm text-ink/70"><span className="md:hidden">Valor: </span>{r.monthly_price ? money(r.monthly_price) : '—'}</span>
            <span className={`text-sm ${late(r) ? 'font-bold text-red-700' : 'text-ink/70'}`}><span className="md:hidden">Vence: </span>{dt(r.next_due_at)}</span>
            <span><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${r.subscription_status === 'active' ? 'bg-green-100 text-green-800' : r.subscription_status === 'past_due' ? 'bg-red-100 text-red-800' : 'bg-sand text-ink'}`}>{SUB_LABEL[r.subscription_status ?? 'trial'] ?? r.subscription_status}</span></span>
          </button>
        ))}
      </div>

      {editing && <BillingModal b={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
    </div>
  );
}
