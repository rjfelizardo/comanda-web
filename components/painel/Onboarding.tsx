'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/client';
import { RESERVED_SLUGS, slugify } from '@/lib/format';

const SEGMENTS = [
  ['pizzaria', 'Pizzaria'], ['hamburgueria', 'Hamburgueria'], ['padaria', 'Padaria'], ['lanchonete', 'Lanchonete'],
  ['acai', 'Açaí'], ['marmitaria', 'Marmitaria'], ['confeitaria', 'Confeitaria'], ['mercearia', 'Mercearia'], ['outro', 'Outro'],
];

export default function Onboarding({ email }: { email: string }) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [touched, setTouched] = useState(false);
  const [segment, setSegment] = useState('outro');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const s = slugify(slug || name);
    if (name.trim().length < 2) return setError('Informe o nome do seu negócio.');
    if (s.length < 3) return setError('O endereço precisa ter pelo menos 3 letras.');
    if (RESERVED_SLUGS.includes(s)) return setError('Esse endereço não pode ser usado. Escolha outro.');
    setBusy(true);
    const { data, error } = await supabaseBrowser().rpc('create_business', { p_name: name.trim(), p_slug: s, p_segment: segment });
    if (error) {
      if (error.code === '23505') setError('Esse endereço já está em uso. Tente outro.');
      else if (/limit/.test(error.message)) setError('Você atingiu o limite de negócios da sua conta.');
      else setError('Não foi possível criar agora. Tente novamente.');
      setBusy(false);
      return;
    }
    document.cookie = `comanda-biz=${data}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="grid gap-5">
      <div className="text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="" width={72} height={72} className="mx-auto" />
        <h1 className="mt-3 text-3xl font-extrabold">Vamos abrir sua loja</h1>
        <p className="mt-1 text-sm text-ink/60">Conta: {email}</p>
      </div>
      <div>
        <label className="label" htmlFor="n">Nome do negócio</label>
        <input id="n" className="input" value={name} maxLength={80} onChange={(e) => { setName(e.target.value); if (!touched) setSlug(slugify(e.target.value)); }} />
      </div>
      <div>
        <label className="label" htmlFor="s">Endereço da sua loja</label>
        <div className="flex items-center overflow-hidden rounded-xl border border-sand bg-white focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/25">
          <span className="pl-4 text-sm text-ink/50">/</span>
          <input id="s" className="w-full bg-transparent px-1 py-3 outline-none" value={slug} onChange={(e) => { setTouched(true); setSlug(slugify(e.target.value)); }} />
        </div>
        <p className="mt-1 text-xs text-ink/50">É o link que você vai divulgar para os clientes.</p>
      </div>
      <div>
        <label className="label" htmlFor="seg">Tipo de negócio</label>
        <select id="seg" className="input" value={segment} onChange={(e) => setSegment(e.target.value)}>
          {SEGMENTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>
      {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      <button className="btn-primary" disabled={busy}>{busy ? 'Criando…' : 'Criar minha loja'}</button>
    </form>
  );
}
