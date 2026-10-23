'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabaseBrowser } from '@/lib/supabase/client';
import { STATUS_LABEL, dt, adminError } from './shared';

type Row = { id: string; slug: string; name: string; status: string; created_at: string; owner_name: string | null; owner_email: string | null; city: string | null; state: string | null };

export default function LojistasList() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('all');

  useEffect(() => {
    supabaseBrowser().rpc('admin_list_businesses').then(({ data, error }) => {
      if (error) setError(adminError(error.message));
      else setRows((data ?? []) as Row[]);
    });
  }, []);

  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return (rows ?? []).filter((b) => {
      if (status !== 'all' && b.status !== status) return false;
      if (!t) return true;
      return [b.name, b.slug, b.owner_name ?? '', b.owner_email ?? '', b.city ?? ''].some((v) => v.toLowerCase().includes(t));
    });
  }, [rows, q, status]);

  if (error) return <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-800">{error}</p>;
  if (!rows) return <p className="py-10 text-center text-ink/50">Carregando…</p>;

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
      <div>
        <h1 className="text-2xl font-extrabold">Lojistas</h1>
        <p className="text-sm text-ink/60">{rows.length} {rows.length === 1 ? 'loja cadastrada' : 'lojas cadastradas'}. Toque em uma loja para ver o cadastro completo.</p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input className="input" placeholder="Buscar por loja, link, responsável, e-mail ou cidade" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="input sm:max-w-[12rem]" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="all">Todas</option>
          <option value="active">Ativas</option>
          <option value="suspended">Suspensas</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-2xl bg-white shadow-card">
        <div className="hidden grid-cols-[2fr_1.5fr_1fr_1fr_7rem] gap-3 border-b border-sand bg-cream px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-ink/50 md:grid">
          <span>Loja</span><span>Responsável</span><span>Cidade</span><span>Criada em</span><span>Situação</span>
        </div>
        {shown.length === 0 && <p className="p-8 text-center text-ink/60">Nenhuma loja encontrada.</p>}
        {shown.map((b) => (
          <Link key={b.id} href={`/admin/lojas/${b.id}`} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-0.5 border-b border-sand px-4 py-3 last:border-0 hover:bg-cream md:grid-cols-[2fr_1.5fr_1fr_1fr_7rem]">
            <span className="min-w-0">
              <span className="block break-words font-bold">{b.name}</span>
              <span className="block break-all text-xs text-ink/50">{b.slug}</span>
            </span>
            <span className="order-last col-span-2 min-w-0 break-words text-sm text-ink/70 md:order-none md:col-span-1">{b.owner_name || b.owner_email || '—'}</span>
            <span className="hidden text-sm text-ink/70 md:block">{b.city ? `${b.city}${b.state ? '/' + b.state : ''}` : '—'}</span>
            <span className="hidden text-sm text-ink/70 md:block">{dt(b.created_at)}</span>
            <span className={`justify-self-end rounded-full px-2.5 py-1 text-xs font-bold md:justify-self-start ${b.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{STATUS_LABEL[b.status] ?? b.status}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
