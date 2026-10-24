'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/client';
import { RESERVED_SLUGS, slugify, normalizePhone, onlyDigits } from '@/lib/format';

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
  const [ownerName, setOwnerName] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [docNum, setDocNum] = useState('');
  const [legalName, setLegalName] = useState('');
  const [instagram, setInstagram] = useState('');
  const [wa, setWa] = useState('');
  const [city, setCity] = useState('');
  const [uf, setUf] = useState('');
  const [address, setAddress] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const s = slugify(slug || name);
    if (name.trim().length < 2) return setError('Informe o nome do seu negócio.');
    if (s.length < 3) return setError('O endereço precisa ter pelo menos 3 letras.');
    if (RESERVED_SLUGS.includes(s)) return setError('Esse endereço não pode ser usado. Escolha outro.');
    if (ownerName.trim().length < 3) return setError('Informe o seu nome completo.');
    const ownerP = normalizePhone(ownerPhone);
    if (!/^[0-9]{12,13}$/.test(ownerP)) return setError('Informe o seu WhatsApp com DDD.');
    const waP = normalizePhone(wa || ownerPhone);
    if (!/^[0-9]{12,13}$/.test(waP)) return setError('Informe o WhatsApp da loja com DDD.');
    if (city.trim().length < 2 || uf.trim().length !== 2) return setError('Informe a cidade e o estado (UF) da loja.');
    const doc = onlyDigits(docNum);
    if (doc && doc.length !== 11 && doc.length !== 14) return setError('CPF deve ter 11 números e CNPJ 14. Deixe em branco se preferir informar depois.');
    setBusy(true);
    const sb = supabaseBrowser();
    let { data, error } = await sb.rpc('create_business_full', {
      p_name: name.trim(), p_slug: s, p_segment: segment,
      p_owner_name: ownerName.trim(), p_owner_phone: ownerP, p_document: doc, p_legal_name: legalName.trim(), p_instagram: instagram.trim(),
      p_whatsapp: waP, p_city: city.trim(), p_state: uf.trim(), p_address: address.trim(),
    });
    // SQL 15 ainda nao rodou: cria so com os dados basicos
    if (error && /create_business_full|schema cache|does not exist/.test(error.message)) {
      ({ data, error } = await sb.rpc('create_business', { p_name: name.trim(), p_slug: s, p_segment: segment }));
    }
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
        <img src="/logo-redondo-c.png" alt="" width={72} height={72} className="mx-auto" />
        <h1 className="mt-3 text-3xl font-extrabold">Vamos abrir sua loja</h1>
        <p className="mt-1 text-sm text-ink/60">Conta: {email}</p>
      </div>
      <fieldset className="grid gap-4">
        <legend className="mb-1 text-sm font-extrabold uppercase tracking-wide text-ink/50">Sobre você</legend>
        <div>
          <label className="label" htmlFor="on">Seu nome completo</label>
          <input id="on" className="input" autoComplete="name" value={ownerName} maxLength={100} onChange={(e) => setOwnerName(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="op">Seu WhatsApp (com DDD)</label>
          <input id="op" className="input" inputMode="tel" autoComplete="tel" placeholder="(74) 99999-9999" value={ownerPhone} maxLength={20} onChange={(e) => setOwnerPhone(e.target.value)} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="doc">CPF ou CNPJ <span className="font-normal text-ink/40">(opcional)</span></label>
            <input id="doc" className="input" inputMode="numeric" value={docNum} maxLength={20} onChange={(e) => setDocNum(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="ln">Razão social <span className="font-normal text-ink/40">(opcional)</span></label>
            <input id="ln" className="input" value={legalName} maxLength={100} onChange={(e) => setLegalName(e.target.value)} />
          </div>
        </div>
      </fieldset>

      <fieldset className="grid gap-4">
        <legend className="mb-1 text-sm font-extrabold uppercase tracking-wide text-ink/50">Sobre o negócio</legend>
        <div>
          <label className="label" htmlFor="n">Nome do negócio</label>
          <input id="n" className="input" value={name} maxLength={80} onChange={(e) => { setName(e.target.value); if (!touched) setSlug(slugify(e.target.value)); }} />
        </div>
        <div>
          <label className="label" htmlFor="seg">Tipo de negócio</label>
          <select id="seg" className="input" value={segment} onChange={(e) => setSegment(e.target.value)}>
            {SEGMENTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="wa">WhatsApp da loja <span className="font-normal text-ink/40">(se for o mesmo, deixe em branco)</span></label>
          <input id="wa" className="input" inputMode="tel" placeholder="(74) 99999-9999" value={wa} maxLength={20} onChange={(e) => setWa(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="ig">Instagram <span className="font-normal text-ink/40">(opcional)</span></label>
          <input id="ig" className="input" placeholder="@sualoja" value={instagram} maxLength={60} onChange={(e) => setInstagram(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="ad">Endereço <span className="font-normal text-ink/40">(rua, número e bairro)</span></label>
          <input id="ad" className="input" autoComplete="street-address" value={address} maxLength={160} onChange={(e) => setAddress(e.target.value)} />
        </div>
        <div className="grid grid-cols-[minmax(0,1fr)_5rem] gap-4">
          <div>
            <label className="label" htmlFor="ci">Cidade</label>
            <input id="ci" className="input" value={city} maxLength={80} onChange={(e) => setCity(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="uf">UF</label>
            <input id="uf" className="input" maxLength={2} value={uf} onChange={(e) => setUf(e.target.value.toUpperCase())} />
          </div>
        </div>
      </fieldset>

      <div>
        <label className="label" htmlFor="s">Endereço da sua loja na internet</label>
        <div className="flex items-center overflow-hidden rounded-xl border border-sand bg-white focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/25">
          <span className="pl-4 text-sm text-ink/50">/</span>
          <input id="s" className="w-full bg-transparent px-1 py-3 outline-none" value={slug} onChange={(e) => { setTouched(true); setSlug(slugify(e.target.value)); }} />
        </div>
        <p className="mt-1 text-xs text-ink/50">É o link que você vai divulgar para os clientes.</p>
      </div>
      {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      <button className="btn-primary" disabled={busy}>{busy ? 'Criando…' : 'Criar minha loja'}</button>
    </form>
  );
}
