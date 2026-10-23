'use client';
import { useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';

export const STATUS_LABEL: Record<string, string> = { active: 'Ativa', suspended: 'Suspensa', archived: 'Arquivada' };
export const SUB_LABEL: Record<string, string> = { trial: 'Teste grátis', active: 'Em dia', past_due: 'Atrasado', canceled: 'Cancelada' };
export const dt = (s: string | null | undefined) => (s ? new Date(s).toLocaleDateString('pt-BR') : '—');
export const money = (n: number) => Number(n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export type Billing = {
  id: string; name: string;
  plan: string | null; subscription_status: string | null; trial_ends_at: string | null;
  custom_branding: boolean; notes: string | null; monthly_price: number | null; next_due_at: string | null;
};

export function adminError(msg: string) {
  return /does not exist|schema cache/.test(msg) ? 'Rode o SQL 14 e o SQL 15 no Supabase para ativar esta tela.' : msg;
}

export function BillingModal({ b, onClose, onSaved }: { b: Billing; onClose: () => void; onSaved: () => void }) {
  const [plan, setPlan] = useState(b.plan ?? 'trial');
  const [sub, setSub] = useState(b.subscription_status ?? 'trial');
  const [trial, setTrial] = useState(b.trial_ends_at ? b.trial_ends_at.slice(0, 10) : '');
  const [price, setPrice] = useState(b.monthly_price ? String(b.monthly_price) : '');
  const [due, setDue] = useState(b.next_due_at ?? '');
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
      p_monthly_price: price ? Number(price.replace(',', '.')) || 0 : 0,
      p_next_due_at: due || null,
    });
    setBusy(false);
    if (error) { setErr(adminError(error.message)); return; }
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white p-5 sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="break-words text-lg font-extrabold">{b.name}</h2>
        <p className="text-sm text-ink/60">Plano e cobrança</p>
        <div className="mt-4 grid gap-3">
          <label className="grid gap-1 text-sm font-semibold">Plano
            <input className="input" list="planos" value={plan} onChange={(e) => setPlan(e.target.value)} maxLength={40} />
            <datalist id="planos"><option value="trial" /><option value="basico" /><option value="pro" /><option value="gratis" /></datalist>
          </label>
          <label className="grid gap-1 text-sm font-semibold">Valor mensal (R$)
            <input className="input" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0,00" />
          </label>
          <label className="grid gap-1 text-sm font-semibold">Situação
            <select className="input" value={sub} onChange={(e) => setSub(e.target.value)}>
              {Object.entries(SUB_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-semibold">Próximo vencimento
            <input type="date" className="input" value={due} onChange={(e) => setDue(e.target.value)} />
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
