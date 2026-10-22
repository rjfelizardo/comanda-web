'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { brl } from '@/lib/format';

type Coupon = {
  id: string; code: string; kind: 'percent' | 'fixed' | 'free_delivery'; value: number; min_order: number;
  max_uses: number | null; uses_count: number; once_per_phone: boolean; expires_at: string | null; is_active: boolean; show_public?: boolean;
};

const num = (s: string) => {
  const n = Number(String(s).replace(',', '.'));
  return Number.isFinite(n) && n >= 0 ? n : NaN;
};

const label = (c: Coupon) =>
  c.kind === 'percent' ? `${c.value}% de desconto` : c.kind === 'fixed' ? `${brl(c.value)} de desconto` : 'Entrega grátis';

export default function Coupons({ businessId, canEdit }: { businessId: string; canEdit: boolean }) {
  const [list, setList] = useState<Coupon[] | null>(null);
  const [code, setCode] = useState('');
  const [kind, setKind] = useState<Coupon['kind']>('percent');
  const [value, setValue] = useState('10');
  const [minOrder, setMinOrder] = useState('');
  const [maxUses, setMaxUses] = useState('');
  const [expires, setExpires] = useState('');
  const [once, setOnce] = useState(true);
  const [pub, setPub] = useState(true);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabaseBrowser().from('coupons').select('*').eq('business_id', businessId).order('created_at', { ascending: false });
    setList(((data ?? []) as any[]).map((c) => ({ ...c, value: Number(c.value), min_order: Number(c.min_order) })));
  }, [businessId]);
  useEffect(() => { load(); }, [load]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    const c = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (c.length < 3) return setErr('O código precisa ter de 3 a 20 letras ou números (sem espaço).');
    const v = kind === 'free_delivery' ? 0 : num(value);
    if (Number.isNaN(v) || (kind === 'percent' && (v < 1 || v > 100)) || (kind === 'fixed' && v <= 0)) return setErr('Valor do desconto inválido.');
    const mo = minOrder.trim() === '' ? 0 : num(minOrder);
    if (Number.isNaN(mo)) return setErr('Pedido mínimo inválido.');
    const mu = maxUses.trim() === '' ? null : parseInt(maxUses, 10);
    if (mu !== null && (!Number.isInteger(mu) || mu < 1)) return setErr('Limite de usos inválido.');
    setBusy(true);
    const row = {
      business_id: businessId, code: c, kind, value: v, min_order: mo, max_uses: mu, once_per_phone: once,
      expires_at: expires ? new Date(expires + 'T23:59:59').toISOString() : null,
    };
    let { error } = await supabaseBrowser().from('coupons').insert({ ...row, show_public: pub });
    // Antes do SQL 06 a coluna show_public nao existe: cria sem ela.
    if (error && error.code !== '23505') ({ error } = await supabaseBrowser().from('coupons').insert(row));
    setBusy(false);
    if (error) return setErr(error.code === '23505' ? 'Já existe um cupom com esse código.' : 'Não foi possível criar o cupom.');
    setCode(''); setMinOrder(''); setMaxUses(''); setExpires('');
    load();
  }

  async function toggle(c: Coupon) {
    await supabaseBrowser().from('coupons').update({ is_active: !c.is_active }).eq('id', c.id);
    load();
  }
  async function togglePublic(c: Coupon) {
    const { error } = await supabaseBrowser().from('coupons').update({ show_public: !c.show_public }).eq('id', c.id);
    if (error) setErr('Para mostrar cupons na loja, rode o SQL 06 no Supabase.');
    load();
  }
  async function remove(c: Coupon) {
    if (!confirm(`Apagar o cupom ${c.code}?`)) return;
    await supabaseBrowser().from('coupons').delete().eq('id', c.id);
    load();
  }

  return (
    <div className="grid gap-5 pb-10">
      <h1 className="text-2xl font-extrabold">Cupons</h1>

      {canEdit && (
        <form onSubmit={create} className="card grid gap-3 p-4">
          <h2 className="font-bold">Novo cupom</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label">Código (o cliente digita)</label>
              <input className="input uppercase" placeholder="BEMVINDO10" maxLength={20} value={code} onChange={(e) => setCode(e.target.value)} />
            </div>
            <div>
              <label className="label">Tipo</label>
              <select className="input" value={kind} onChange={(e) => setKind(e.target.value as Coupon['kind'])}>
                <option value="percent">Percentual (%)</option>
                <option value="fixed">Valor fixo (R$)</option>
                <option value="free_delivery">Entrega grátis</option>
              </select>
            </div>
            {kind !== 'free_delivery' && (
              <div>
                <label className="label">{kind === 'percent' ? 'Desconto (%)' : 'Desconto (R$)'}</label>
                <input className="input" inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} />
              </div>
            )}
            <div>
              <label className="label">Pedido mínimo (R$, opcional)</label>
              <input className="input" inputMode="decimal" value={minOrder} onChange={(e) => setMinOrder(e.target.value)} />
            </div>
            <div>
              <label className="label">Limite de usos (opcional)</label>
              <input className="input" inputMode="numeric" value={maxUses} onChange={(e) => setMaxUses(e.target.value)} />
            </div>
            <div>
              <label className="label">Vale até (opcional)</label>
              <input type="date" className="input" value={expires} onChange={(e) => setExpires(e.target.value)} />
            </div>
          </div>
          <label className="flex items-center gap-3 text-sm font-medium">
            <input type="checkbox" className="h-5 w-5 accent-brand" checked={once} onChange={(e) => setOnce(e.target.checked)} />
            Cada cliente (WhatsApp) pode usar uma vez só
          </label>
          <label className="flex items-center gap-3 text-sm font-medium">
            <input type="checkbox" className="h-5 w-5 accent-brand" checked={pub} onChange={(e) => setPub(e.target.checked)} />
            Mostrar na loja (aparece no botão 🎟 Cupons). Desmarque para um cupom secreto.
          </label>
          {err && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{err}</p>}
          <button className="btn-primary" disabled={busy}>{busy ? 'Criando…' : 'Criar cupom'}</button>
        </form>
      )}

      <div className="card divide-y divide-sand">
        {list === null && <p className="p-6 text-center text-ink/50">Carregando…</p>}
        {list?.length === 0 && <p className="p-6 text-center text-ink/60">Nenhum cupom ainda.</p>}
        {list?.map((c) => (
          <div key={c.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <p className="font-display text-lg font-extrabold tracking-wider">{c.code} {!c.is_active && <span className="chip bg-sand text-ink/60">Pausado</span>} {c.show_public && <span className="chip bg-green-100 text-green-800">Na loja</span>}</p>
              <p className="text-sm text-ink/70">
                {label(c)}
                {c.min_order > 0 ? ` · acima de ${brl(c.min_order)}` : ''}
                {c.expires_at ? ` · até ${new Date(c.expires_at).toLocaleDateString('pt-BR')}` : ''}
              </p>
              <p className="text-xs text-ink/50">Usado {c.uses_count}{c.max_uses ? ` de ${c.max_uses}` : ''} vez(es){c.once_per_phone ? ' · 1 uso por cliente' : ''}</p>
            </div>
            {canEdit && (
              <div className="flex gap-2 text-sm">
                <button className="btn-ghost btn-sm" onClick={() => togglePublic(c)}>{c.show_public ? 'Ocultar da loja' : 'Mostrar na loja'}</button>
                <button className="btn-ghost btn-sm" onClick={() => toggle(c)}>{c.is_active ? 'Pausar' : 'Ativar'}</button>
                <button className="btn-danger btn-sm" onClick={() => remove(c)}>Apagar</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
