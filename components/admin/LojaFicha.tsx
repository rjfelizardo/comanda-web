'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/client';
import { storeUrl } from '@/lib/storeUrl';
import { BillingModal, STATUS_LABEL, SUB_LABEL, dt, money, adminError } from './shared';

type Biz = any;

function Field({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-semibold text-ink/50">{k}</p>
      <p className="break-words text-sm font-semibold">{v || '—'}</p>
    </div>
  );
}

export default function LojaFicha({ id }: { id: string }) {
  const router = useRouter();
  const [b, setB] = useState<Biz | null>(null);
  const [error, setError] = useState('');
  const [billing, setBilling] = useState(false);
  const [reg, setReg] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabaseBrowser().rpc('admin_get_business', { p_business: id });
    if (error) { setError(adminError(error.message)); return; }
    if (!data) { setError('Loja não encontrada.'); return; }
    setError(''); setB(data);
  }, [id]);
  useEffect(() => { load(); }, [load]);

  async function setStatus(status: string) {
    if (!confirm(status === 'suspended' ? `Suspender "${b.name}"? A loja sai do ar e deixa de receber pedidos.` : `Reativar "${b.name}"?`)) return;
    const { error } = await supabaseBrowser().rpc('admin_set_status', { p_business: id, p_status: status });
    if (error) { alert(error.message); return; }
    load();
  }
  async function remove() {
    const typed = prompt(`EXCLUIR "${b.name}" de vez?\nIsso apaga cardápio, pedidos, clientes e conversas e não dá para desfazer.\n\nPara confirmar, digite o link da loja: ${b.slug}`);
    if (typed === null) return;
    const { error } = await supabaseBrowser().rpc('admin_delete_business', { p_business: id, p_confirm_slug: typed.trim() });
    if (error) { alert(error.message.includes('confirmation_mismatch') ? 'O link digitado não confere. Nada foi excluído.' : error.message); return; }
    router.replace('/admin');
    router.refresh();
  }

  if (error) return <div className="grid gap-3"><Link href="/admin" className="text-sm font-semibold underline">← Lojistas</Link><p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-800">{error}</p></div>;
  if (!b) return <p className="py-10 text-center text-ink/50">Carregando…</p>;

  const endereco = [b.address_text, b.city && b.state ? `${b.city}/${b.state}` : b.city].filter(Boolean).join(' · ');

  return (
    <div className="grid max-w-3xl grid-cols-[minmax(0,1fr)] gap-5">
      <Link href="/admin" className="text-sm font-semibold text-brand-dark underline">← Lojistas</Link>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="break-words text-2xl font-extrabold">{b.name}</h1>
          <p className="break-all text-sm text-ink/60">{b.slug}.comanda.bridgeatravessia.com.br</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${b.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{STATUS_LABEL[b.status] ?? b.status}</span>
      </div>

      <section className="rounded-2xl bg-white p-5 shadow-card">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-extrabold">Responsável</h2>
          <button className="text-sm font-semibold text-brand-dark underline" onClick={() => setReg(true)}>Editar</button>
        </div>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field k="Nome" v={b.owner_name} />
          <Field k="E-mail de acesso" v={b.owner_email} />
          <Field k="Telefone" v={b.owner_phone} />
          <Field k="CPF / CNPJ" v={b.document} />
          <Field k="Razão social" v={b.legal_name} />
          <Field k="Instagram" v={b.instagram} />
        </div>
      </section>

      <section className="rounded-2xl bg-white p-5 shadow-card">
        <h2 className="font-extrabold">Loja</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field k="Tipo de negócio" v={b.segment} />
          <Field k="WhatsApp da loja" v={b.whatsapp_contact} />
          <div className="sm:col-span-2"><Field k="Endereço" v={endereco} /></div>
          <Field k="Atende" v={[b.accepts_delivery && 'Entrega', b.accepts_pickup && 'Retirada'].filter(Boolean).join(' e ')} />
          <Field k="Atendente de WhatsApp (IA)" v={b.wa_connected ? 'Conectado' : 'Não conectado'} />
          <Field k="Criada em" v={dt(b.created_at)} />
          <Field k="Usuários com acesso" v={String(b.members)} />
          <Field k="Produtos no cardápio" v={String(b.products_count)} />
          <Field k="Pedidos recebidos" v={String(b.orders_total)} />
          <Field k="Último pedido" v={dt(b.last_order_at)} />
        </div>
      </section>

      <section className="rounded-2xl bg-white p-5 shadow-card">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-extrabold">Plano e cobrança</h2>
          <button className="text-sm font-semibold text-brand-dark underline" onClick={() => setBilling(true)}>Editar</button>
        </div>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field k="Plano" v={b.plan ?? 'trial'} />
          <Field k="Situação" v={SUB_LABEL[b.subscription_status ?? 'trial'] ?? b.subscription_status} />
          <Field k="Valor mensal" v={Number(b.monthly_price) ? money(Number(b.monthly_price)) : ''} />
          <Field k="Próximo vencimento" v={dt(b.next_due_at)} />
          <Field k="Fim do teste grátis" v={dt(b.trial_ends_at)} />
          <Field k="Personalização (logo e fachada)" v={b.custom_branding ? 'Liberada' : 'Não liberada'} />
          <div className="sm:col-span-2"><Field k="Observações" v={b.notes} /></div>
        </div>
      </section>

      <section className="flex flex-wrap gap-2">
        <a className="btn-ghost" href={storeUrl(b.slug)} target="_blank" rel="noreferrer">Ver loja</a>
        {b.whatsapp_contact && <a className="btn-ghost" href={`https://wa.me/${b.whatsapp_contact}`} target="_blank" rel="noreferrer">WhatsApp da loja</a>}
        {b.status === 'active'
          ? <button className="btn-ghost text-red-700" onClick={() => setStatus('suspended')}>Suspender</button>
          : <button className="btn-primary" onClick={() => setStatus('active')}>Reativar</button>}
        <button className="btn-ghost text-red-700" onClick={remove}>Excluir loja</button>
      </section>

      {billing && <BillingModal b={b} onClose={() => setBilling(false)} onSaved={() => { setBilling(false); load(); }} />}
      {reg && <RegistryModal b={b} onClose={() => setReg(false)} onSaved={() => { setReg(false); load(); }} />}
    </div>
  );
}

function RegistryModal({ b, onClose, onSaved }: { b: Biz; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({ owner_name: b.owner_name ?? '', owner_phone: b.owner_phone ?? '', document: b.document ?? '', legal_name: b.legal_name ?? '', instagram: b.instagram ?? '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const set = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }));
  async function save() {
    setBusy(true); setErr('');
    const { error } = await supabaseBrowser().rpc('admin_update_registry', {
      p_business: b.id, p_owner_name: f.owner_name, p_owner_phone: f.owner_phone, p_document: f.document, p_legal_name: f.legal_name, p_instagram: f.instagram,
    });
    setBusy(false);
    if (error) { setErr(adminError(error.message)); return; }
    onSaved();
  }
  const rows: [keyof typeof f, string][] = [['owner_name', 'Nome do responsável'], ['owner_phone', 'Telefone'], ['document', 'CPF ou CNPJ'], ['legal_name', 'Razão social'], ['instagram', 'Instagram']];
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white p-5 sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-extrabold">Responsável</h2>
        <div className="mt-4 grid gap-3">
          {rows.map(([k, l]) => (
            <label key={k} className="grid gap-1 text-sm font-semibold">{l}
              <input className="input" value={f[k]} onChange={(e) => set(k, e.target.value)} maxLength={120} />
            </label>
          ))}
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
