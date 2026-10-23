'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { storeUrl } from '@/lib/storeUrl';
import { brl } from '@/lib/format';

type Biz = {
  id: string; slug: string; name: string; segment: string; status: string; created_at: string;
  owner_email: string | null; whatsapp_contact: string | null;
  plan: string | null; subscription_status: string | null; trial_ends_at: string | null; custom_branding: boolean; notes: string | null;
  products_count: number; orders_total: number; orders_30d: number; revenue_30d: number; last_order_at: string | null;
  wa_connected: boolean;
};

const STATUS_LABEL: Record<string, string> = { active: 'Ativa', suspended: 'Suspensa', archived: 'Arquivada' };
const SUB_LABEL: Record<string, string> = { trial: 'Teste grátis', active: 'Assinatura ativa', past_due: 'Pagamento atrasado', canceled: 'Cancelada' };
const dt = (s: string | null) => (s ? new Date(s).toLocaleDateString('pt-BR') : '—');

export default function AdminBoard() {
  const [rows, setRows] = useState<Biz[] | null>(null);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'suspended' | 'inactive'>('all');
  const [editing, setEditing] = useState<Biz | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabaseBrowser().rpc('admin_list_businesses');
    if (error) { setError(error.message.includes('does not exist') ? 'Rode o SQL 14 no Supabase para ativar o Admin.' : error.message); return; }
    setError('');
    setRows(((data ?? []) as any[]).map((r) => ({ ...r, revenue_30d: Number(r.revenue_30d) })) as Biz[]);
  }, []);
  useEffect(() => { load(); }, [load]);

  const stats = useMemo(() => {
    const r = rows ?? [];
    return {
      total: r.length,
      active: r.filter((x) => x.status === 'active').length,
      orders: r.reduce((a, x) => a + x.orders_30d, 0),
      revenue: r.reduce((a, x) => a + x.revenue_30d, 0),
    };
  }, [rows]);

  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return (rows ?? []).filter((b) => {
      if (filter === 'active' && b.status !== 'active') return false;
      if (filter === 'suspended' && b.status !== 'suspended') return false;
      if (filter === 'inactive' && b.orders_30d > 0) return false;
      if (!t) return true;
      return [b.name, b.slug, b.owner_email ?? '', b.whatsapp_contact ?? ''].some((v) => v.toLowerCase().includes(t));
    });
  }, [rows, q, filter]);

  async function setStatus(b: Biz, status: string) {
    const msg = status === 'suspended' ? `Suspender "${b.name}"? A loja sai do ar e deixa de receber pedidos.` : `Reativar "${b.name}"?`;
    if (!confirm(msg)) return;
    const { error } = await supabaseBrowser().rpc('admin_set_status', { p_business: b.id, p_status: status });
    if (error) { alert(error.message); return; }
    load();
  }

  async function remove(b: Biz) {
    const typed = prompt(`EXCLUIR "${b.name}" de vez?\nIsso apaga cardápio, pedidos, clientes e conversas e não dá para desfazer.\n\nPara confirmar, digite o link da loja: ${b.slug}`);
    if (typed === null) return;
    const { error } = await supabaseBrowser().rpc('admin_delete_business', { p_business: b.id, p_confirm_slug: typed.trim() });
    if (error) { alert(error.message.includes('confirmation_mismatch') ? 'O link digitado não confere. Nada foi excluído.' : error.message); return; }
    load();
  }

  if (error) return <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-800">{error}</p>;
  if (!rows) return <p className="py-10 text-center text-ink/50">Carregando…</p>;

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-5">
      <h1 className="text-2xl font-extrabold">Lojistas</h1>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          ['Lojas', String(stats.total)],
          ['Ativas', String(stats.active)],
          ['Pedidos (30 dias)', String(stats.orders)],
          ['Vendido (30 dias)', brl(stats.revenue)],
        ].map(([k, v]) => (
          <div key={k} className="card p-4">
            <p className="text-xs font-semibold text-ink/60">{k}</p>
            <p className="mt-1 break-words text-xl font-extrabold">{v}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <input className="input" placeholder="Buscar por loja, link, e-mail ou WhatsApp" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="input sm:max-w-[14rem]" value={filter} onChange={(e) => setFilter(e.target.value as any)}>
          <option value="all">Todas</option>
          <option value="active">Ativas</option>
          <option value="suspended">Suspensas</option>
          <option value="inactive">Sem pedidos em 30 dias</option>
        </select>
      </div>

      {shown.length === 0 && <div className="card p-10 text-center text-ink/60">Nenhuma loja encontrada.</div>}

      <div className="grid grid-cols-[minmax(0,1fr)] gap-3">
        {shown.map((b) => (
          <div key={b.id} className={`card p-4 ${b.status === 'active' ? '' : 'opacity-70'}`}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="break-words text-lg font-extrabold leading-tight">{b.name}</p>
                <p className="break-all text-sm text-ink/60">{b.slug}.comanda.bridgeatravessia.com.br</p>
                <p className="break-all text-sm text-ink/60">{b.owner_email ?? 'sem dono'}{b.whatsapp_contact ? ` · ${b.whatsapp_contact}` : ''}</p>
              </div>
              <div className="flex flex-wrap gap-1.5 text-xs font-bold">
                <span className={`rounded-full px-2.5 py-1 ${b.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{STATUS_LABEL[b.status] ?? b.status}</span>
                <span className="rounded-full bg-sand px-2.5 py-1">{SUB_LABEL[b.subscription_status ?? 'trial'] ?? b.subscription_status}</span>
                {b.wa_connected && <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-emerald-800">WhatsApp IA</span>}
                {b.custom_branding && <span className="rounded-full bg-amber-100 px-2.5 py-1 text-amber-800">Personalização</span>}
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-4">
              <p><span className="text-ink/60">Plano:</span> <b>{b.plan ?? 'trial'}</b></p>
              <p><span className="text-ink/60">Produtos:</span> <b>{b.products_count}</b></p>
              <p><span className="text-ink/60">Pedidos 30d:</span> <b>{b.orders_30d}</b></p>
              <p><span className="text-ink/60">Vendas 30d:</span> <b>{brl(b.revenue_30d)}</b></p>
              <p><span className="text-ink/60">Criada em:</span> <b>{dt(b.created_at)}</b></p>
              <p><span className="text-ink/60">Último pedido:</span> <b>{dt(b.last_order_at)}</b></p>
              <p><span className="text-ink/60">Fim do teste:</span> <b>{dt(b.trial_ends_at)}</b></p>
              <p><span className="text-ink/60">Pedidos total:</span> <b>{b.orders_total}</b></p>
            </div>
            {b.notes && <p className="mt-2 break-words rounded-lg bg-cream px-3 py-2 text-sm">{b.notes}</p>}

            <div className="mt-3 flex flex-wrap gap-2">
              <button className="btn-ghost btn-sm" onClick={() => setEditing(b)}>Editar plano</button>
              <a className="btn-ghost btn-sm" href={storeUrl(b.slug)} target="_blank" rel="noreferrer">Ver loja</a>
              {b.whatsapp_contact && <a className="btn-ghost btn-sm" href={`https://wa.me/${b.whatsapp_contact}`} target="_blank" rel="noreferrer">WhatsApp</a>}
              {b.status === 'active'
                ? <button className="btn-ghost btn-sm text-red-700" onClick={() => setStatus(b, 'suspended')}>Suspender</button>
                : <button className="btn-primary btn-sm" onClick={() => setStatus(b, 'active')}>Reativar</button>}
              <button className="btn-ghost btn-sm text-red-700" onClick={() => remove(b)}>Excluir</button>
            </div>
          </div>
        ))}
      </div>

      {editing && <EditBilling b={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
    </div>
  );
}

function EditBilling({ b, onClose, onSaved }: { b: Biz; onClose: () => void; onSaved: () => void }) {
  const [plan, setPlan] = useState(b.plan ?? 'trial');
  const [sub, setSub] = useState(b.subscription_status ?? 'trial');
  const [trial, setTrial] = useState(b.trial_ends_at ? b.trial_ends_at.slice(0, 10) : '');
  const [brand, setBrand] = useState(b.custom_branding);
  const [notes, setNotes] = useState(b.notes ?? '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function save() {
    setBusy(true); setErr('');
    const { error } = await supabaseBrowser().rpc('admin_update_billing', {
      p_business: b.id, p_plan: plan.trim(), p_subscription_status: sub,
      p_trial_ends_at: trial ? new Date(trial + 'T23:59:59').toISOString() : null,
      p_custom_branding: brand, p_notes: notes.trim(),
    });
    setBusy(false);
    if (error) { setErr(error.message); return; }
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white p-5 sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="break-words text-lg font-extrabold">{b.name}</h2>
        <div className="mt-4 grid gap-3">
          <label className="grid gap-1 text-sm font-semibold">Plano
            <input className="input" list="planos" value={plan} onChange={(e) => setPlan(e.target.value)} maxLength={40} />
            <datalist id="planos"><option value="trial" /><option value="basico" /><option value="pro" /><option value="gratis" /></datalist>
          </label>
          <label className="grid gap-1 text-sm font-semibold">Situação da assinatura
            <select className="input" value={sub} onChange={(e) => setSub(e.target.value)}>
              {Object.entries(SUB_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-semibold">Fim do teste grátis
            <input type="date" className="input" value={trial} onChange={(e) => setTrial(e.target.value)} />
          </label>
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input type="checkbox" checked={brand} onChange={(e) => setBrand(e.target.checked)} className="h-5 w-5" />
            Liberar personalização (logo e fachada)
          </label>
          <label className="grid gap-1 text-sm font-semibold">Observações (só você vê)
            <textarea className="input" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} />
          </label>
        </div>
        {err && <p role="alert" className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-800">{err}</p>}
        <div className="mt-4 flex gap-2">
          <button className="btn-primary flex-1" disabled={busy} onClick={save}>{busy ? 'Salvando…' : 'Salvar'}</button>
          <button className="btn-ghost" onClick={onClose}>Cancelar</button>
        </div>
      </div>
    </div>
  );
}
