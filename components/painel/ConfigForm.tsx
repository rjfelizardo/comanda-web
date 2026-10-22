'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/client';
import { uploadImage } from '@/lib/upload';
import { brl, normalizePhone, WEEKDAYS } from '@/lib/format';
import PhotoNames from '@/components/painel/PhotoNames';
import { storeUrl } from '@/lib/storeUrl';

type Day = { on: boolean; opens: string; closes: string };
type Zone = { id: string; name: string; fee: number; min_order: number; eta_min: number | null; is_active: boolean; max_km?: number | null };

const num = (s: string) => {
  const n = Number(String(s).replace(',', '.'));
  return Number.isFinite(n) && n >= 0 ? n : NaN;
};
const hhmm = (t: string) => t.slice(0, 5);

export default function ConfigForm({ businessId, canEdit }: { businessId: string; canEdit: boolean }) {
  const router = useRouter();
  const [b, setB] = useState<any>(null);
  const [days, setDays] = useState<Day[]>(WEEKDAYS.map(() => ({ on: false, opens: '18:00', closes: '23:00' })));
  const [zones, setZones] = useState<Zone[]>([]);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [zName, setZName] = useState('');
  const [zFee, setZFee] = useState('');
  const [brand, setBrand] = useState<boolean | null>(null);
  const [slugInput, setSlugInput] = useState<string | null>(null);
  const [mpOn, setMpOn] = useState<boolean | null>(null);
  const [mpToken, setMpToken] = useState('');
  const [mpBusy, setMpBusy] = useState(false);
  const [wa, setWa] = useState<any>(null);
  const [waPid, setWaPid] = useState('');
  const [waWaba, setWaWaba] = useState('');
  const [waToken, setWaToken] = useState('');
  const [waBusy, setWaBusy] = useState(false);
  const [bKm, setBKm] = useState('');
  const [bFee, setBFee] = useState('');

  const load = useCallback(async () => {
    const s = supabaseBrowser();
    const [bi, hs, zs] = await Promise.all([
      s.from('businesses').select('*').eq('id', businessId).single(),
      s.from('business_hours').select('weekday,opens,closes').eq('business_id', businessId),
      (async () => {
        const q = (cols: string) => s.from('delivery_zones').select(cols).eq('business_id', businessId).order('name');
        const r = await q('id,name,fee,min_order,eta_min,is_active,max_km');
        return r.error ? q('id,name,fee,min_order,eta_min,is_active') : r;
      })(),
    ]);
    const x: any = bi.data;
    if (x) setB({ ...x, min_order: String(x.min_order).replace('.', ','), whatsapp_contact: x.whatsapp_contact ?? '' });
    const d = WEEKDAYS.map(() => ({ on: false, opens: '18:00', closes: '23:00' }));
    ((hs.data ?? []) as any[]).forEach((h) => { d[h.weekday] = { on: true, opens: hhmm(h.opens), closes: hhmm(h.closes) }; });
    setDays(d);
    setZones(((zs.data ?? []) as any[]).map((z) => ({ ...z, fee: Number(z.fee), min_order: Number(z.min_order) })));
  }, [businessId]);

  useEffect(() => { load(); }, [load]);
  const loadMp = useCallback(async () => {
    const { data, error } = await supabaseBrowser().from('payment_accounts').select('status').eq('business_id', businessId).eq('provider', 'mercadopago').maybeSingle();
    setMpOn(!error && data?.status === 'active');
  }, [businessId]);
  useEffect(() => { loadMp(); }, [loadMp]);
  const loadWa = useCallback(async () => {
    const { data, error } = await supabaseBrowser().from('wa_accounts').select('display_phone,bot_enabled,status').eq('business_id', businessId).maybeSingle();
    setWa(!error && data?.status === 'active' ? data : false);
  }, [businessId]);
  useEffect(() => { loadWa(); }, [loadWa]);
  useEffect(() => {
    supabaseBrowser().rpc('has_custom_branding', { p_business: businessId }).then(({ data }) => setBrand(data === true));
  }, [businessId]);

  if (!b) return <p className="py-10 text-center text-ink/50">Carregando…</p>;
  const set = (k: string, v: any) => setB((p: any) => ({ ...p, [k]: v }));
  const siteUrl = storeUrl(b.slug);

  async function img(kind: 'logo_url' | 'banner_url', file?: File) {
    if (!file) return;
    setBusy(true); setErr('');
    try { set(kind, await uploadImage(businessId, file, kind === 'banner_url' ? 1600 : 800)); } catch { setErr('Não foi possível enviar a imagem.'); }
    setBusy(false);
  }

  async function save() {
    setErr(''); setMsg('');
    const min = b.min_order === '' ? 0 : num(b.min_order);
    if (b.name.trim().length < 2) return setErr('Informe o nome do negócio.');
    if (Number.isNaN(min)) return setErr('Pedido mínimo inválido.');
    const wa = b.whatsapp_contact ? normalizePhone(b.whatsapp_contact) : null;
    if (wa && !/^[0-9]{10,15}$/.test(wa)) return setErr('WhatsApp inválido. Use DDD + número.');
    for (let i = 0; i < 7; i++) if (days[i].on && days[i].opens === days[i].closes) return setErr(`${WEEKDAYS[i]}: abertura e fechamento não podem ser iguais.`);
    setBusy(true);
    const s = supabaseBrowser();
    const base = {
      name: b.name.trim(), description: b.description?.trim() || null, logo_url: b.logo_url || null, banner_url: b.banner_url || null,
      whatsapp_contact: wa, address_text: b.address_text?.trim() || null, city: b.city?.trim() || null, state: b.state?.trim() || null,
      accepts_delivery: !!b.accepts_delivery, accepts_pickup: !!b.accepts_pickup, accept_when_closed: !!b.accept_when_closed,
      min_order: min, prep_time_min: Math.max(1, parseInt(b.prep_time_min, 10) || 40),
    };
    const sched = {
      accepts_scheduling: !!b.accepts_scheduling,
      schedule_min_minutes: Math.min(1440, Math.max(10, parseInt(b.schedule_min_minutes, 10) || 30)),
      schedule_max_days: Math.min(30, Math.max(1, parseInt(b.schedule_max_days, 10) || 7)),
    };
    let r = await s.from('businesses').update({ ...base, ...sched }).eq('id', businessId);
    // Antes do SQL 05 as colunas de agendamento nao existem: salva o resto.
    if (r.error && !/plan_required/.test(r.error.message)) r = await s.from('businesses').update(base).eq('id', businessId);
    if (r.error) { setBusy(false); return setErr(/plan_required/.test(r.error.message) ? 'Logo e fachada fazem parte do plano com personalização.' : 'Não foi possível salvar.'); }
    await s.from('business_hours').delete().eq('business_id', businessId);
    const rows = days.map((d, i) => ({ d, i })).filter(({ d }) => d.on).map(({ d, i }) => ({ business_id: businessId, weekday: i, opens: d.opens, closes: d.closes }));
    if (rows.length) {
      const h = await s.from('business_hours').insert(rows);
      if (h.error) { setBusy(false); return setErr('Dados salvos, mas os horários falharam. Tente de novo.'); }
    }
    setBusy(false);
    setMsg('Salvo!');
    load();
    router.refresh();
  }

  async function addZone() {
    const fee = zFee.trim() === '' ? 0 : num(zFee);
    if (!zName.trim() || Number.isNaN(fee)) return setErr('Informe o nome da região e uma taxa válida.');
    const { error } = await supabaseBrowser().from('delivery_zones').insert({ business_id: businessId, name: zName.trim(), fee });
    if (error) return setErr(error.code === '23505' ? 'Já existe uma região com esse nome.' : 'Não foi possível adicionar.');
    setZName(''); setZFee(''); setErr('');
    load();
  }
  async function changeSlug() {
    const next = (slugInput ?? b.slug).trim();
    if (next === b.slug) return;
    setErr(''); setMsg('');
    if (!confirm(`Trocar o endereço da loja para ${next}.comanda.bridgeatravessia.com.br?\n\nO endereço antigo deixa de funcionar. Avise seus clientes e atualize os links do Instagram e do WhatsApp.`)) return;
    setBusy(true);
    const { error } = await supabaseBrowser().rpc('set_business_slug', { p_business: businessId, p_slug: next });
    setBusy(false);
    if (error) {
      const m = error.message || '';
      return setErr(/slug_taken/.test(m) ? 'Esse endereço já está em uso. Escolha outro.'
        : /slug_reserved/.test(m) ? 'Esse nome é reservado pelo sistema. Escolha outro.'
        : /slug_invalid/.test(m) ? 'Use de 3 a 40 letras minúsculas, números e hífen (sem hífen no começo ou no fim).'
        : /forbidden|42501/.test(m) ? 'Só o dono ou gerente pode trocar o endereço.'
        : 'Rode o SQL 11 no Supabase para liberar a troca de endereço.');
    }
    set('slug', next); setSlugInput(null);
    setMsg('Endereço da loja alterado!');
  }
  async function connectMp() {
    setErr(''); setMsg('');
    if (mpToken.trim().length < 20) return setErr('Cole o Access Token completo do Mercado Pago.');
    setMpBusy(true);
    try {
      const res = await fetch('/api/mp/connect', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ business_id: businessId, token: mpToken.trim() }) });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) setErr(j.error || 'Não foi possível conectar.');
      else { setMpToken(''); setMsg('Mercado Pago conectado! Os clientes já podem pagar com Pix.'); loadMp(); }
    } catch { setErr('Sem conexão.'); }
    setMpBusy(false);
  }
  async function connectWa() {
    setErr(''); setMsg('');
    if (waPid.trim().length < 6 || waToken.trim().length < 20) return setErr('Preencha o ID do número e o token.');
    setWaBusy(true);
    try {
      const res = await fetch('/api/wa/connect', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ business_id: businessId, phone_number_id: waPid.trim(), waba_id: waWaba.trim(), token: waToken.trim() }) });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) setErr(j.error || 'Não foi possível conectar.');
      else { setWaToken(''); setMsg('WhatsApp conectado! O atendente já responde por esse número.'); loadWa(); }
    } catch { setErr('Sem conexão.'); }
    setWaBusy(false);
  }
  async function toggleWaBot(on: boolean) {
    const { error } = await supabaseBrowser().rpc('set_wa_bot', { p_business: businessId, p_enabled: on });
    if (error) return setErr('Não foi possível alterar.');
    setMsg(on ? 'Atendente ligado.' : 'Atendente desligado (o número continua conectado).');
    loadWa();
  }
  async function disconnectWa() {
    if (!confirm('Desconectar o WhatsApp? O atendente deixa de responder.')) return;
    const { error } = await supabaseBrowser().rpc('disconnect_wa', { p_business: businessId });
    if (error) return setErr('Não foi possível desconectar.');
    setMsg('WhatsApp desconectado.');
    loadWa();
  }
  async function disconnectMp() {
    if (!confirm('Desconectar o Mercado Pago? Os clientes só poderão pagar na entrega.')) return;
    const { error } = await supabaseBrowser().rpc('disconnect_mp', { p_business: businessId });
    if (error) return setErr('Não foi possível desconectar.');
    setMsg('Mercado Pago desconectado.');
    loadMp();
  }
  const kmMode = b.delivery_mode === 'km';
  const SQL09 = 'Rode o SQL 09 no Supabase para usar a taxa por distância.';
  async function setMode(m: 'zones' | 'km') {
    setErr(''); setMsg('');
    const { error } = await supabaseBrowser().from('businesses').update({ delivery_mode: m }).eq('id', businessId);
    if (error) return setErr(SQL09);
    set('delivery_mode', m);
  }
  async function locateStore() {
    setErr(''); setMsg('');
    const q = [b.address_text, b.city, b.state, 'Brasil'].filter((x: string) => x && String(x).trim()).join(', ');
    if (!b.address_text?.trim()) return setErr('Preencha e salve o endereço da loja primeiro (rua, número e bairro).');
    setBusy(true);
    try {
      const res = await fetch('/api/geocode', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ q }) });
      const j = await res.json();
      if (!res.ok) { setBusy(false); return setErr(j.error || 'Não foi possível localizar.'); }
      const { error } = await supabaseBrowser().from('businesses').update({ store_lat: j.lat, store_lng: j.lng }).eq('id', businessId);
      if (error) { setBusy(false); return setErr(SQL09); }
      set('store_lat', j.lat); set('store_lng', j.lng);
      setMsg('Loja localizada! Confira no mapa pelo link abaixo.');
    } catch { setErr('Sem conexão.'); }
    setBusy(false);
  }
  async function addBand() {
    const km = num(bKm);
    const fee = bFee.trim() === '' ? 0 : num(bFee);
    if (!bKm.trim() || Number.isNaN(km) || km <= 0 || Number.isNaN(fee)) return setErr('Informe a distância (km) e uma taxa válida.');
    const { error } = await supabaseBrowser().from('delivery_zones').insert({ business_id: businessId, name: `Até ${String(km).replace('.', ',')} km`, fee, max_km: km });
    if (error) return setErr(error.code === '23505' ? 'Já existe uma faixa com essa distância.' : SQL09);
    setBKm(''); setBFee(''); setErr('');
    load();
  }
  async function delZone(id: string) {
    await supabaseBrowser().from('delivery_zones').delete().eq('id', id);
    load();
  }

  const dis = !canEdit;

  return (
    <div className="grid gap-6 pb-10">
      <h1 className="text-2xl font-extrabold">Configurações</h1>

      <section className="card p-4">
        <h2 className="font-bold">Link da sua loja</h2>
        <p className="mt-1 break-all rounded-xl bg-sand/60 p-3 text-sm">{siteUrl}</p>
        <button className="btn-ghost btn-sm mt-2" onClick={() => { navigator.clipboard?.writeText(siteUrl); setMsg('Link copiado!'); }}>Copiar link</button>
      </section>

      <section className="card grid gap-4 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-bold">Personalizar a loja</h2>
            <p className="text-sm text-ink/60">Deixe a página de pedidos com a cara do seu negócio.</p>
          </div>
          <span className={`chip ${brand ? 'bg-green-100 text-green-800' : 'bg-brand-sun/60 text-ink'}`}>{brand ? 'Ativo' : 'Plano Personalizado'}</span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-sand p-3">
            <p className="text-sm font-bold">Logo</p>
            <p className="mb-2 text-xs text-ink/60">Quadrada, ex.: 500 × 500 px</p>
            {b.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={b.logo_url} alt="" className="h-24 w-24 rounded-2xl object-cover" />
            ) : <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-sand text-xs text-ink/50">Sem logo</div>}
            <div className="mt-3 flex gap-2">
              <label className={`btn-ghost btn-sm ${dis || !brand ? 'pointer-events-none opacity-50' : 'cursor-pointer'}`}>{b.logo_url ? 'Trocar logo' : 'Enviar logo'}<input disabled={dis || !brand} type="file" accept="image/*" className="hidden" onChange={(e) => img('logo_url', e.target.files?.[0])} /></label>
              {b.logo_url && brand && !dis && <button className="text-sm text-red-700 underline" onClick={() => set('logo_url', '')}>Remover</button>}
            </div>
          </div>
          <div className="rounded-2xl border border-sand p-3">
            <p className="text-sm font-bold">Fachada da loja</p>
            <p className="mb-2 text-xs text-ink/60">Foto larga no topo, ex.: 1600 × 600 px</p>
            {b.banner_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={b.banner_url} alt="" className="h-24 w-full rounded-2xl object-cover" />
            ) : <div className="flex h-24 w-full items-center justify-center rounded-2xl bg-sand text-xs text-ink/50">Sem fachada</div>}
            <div className="mt-3 flex gap-2">
              <label className={`btn-ghost btn-sm ${dis || !brand ? 'pointer-events-none opacity-50' : 'cursor-pointer'}`}>{b.banner_url ? 'Trocar fachada' : 'Enviar fachada'}<input disabled={dis || !brand} type="file" accept="image/*" className="hidden" onChange={(e) => img('banner_url', e.target.files?.[0])} /></label>
              {b.banner_url && brand && !dis && <button className="text-sm text-red-700 underline" onClick={() => set('banner_url', '')}>Remover</button>}
            </div>
          </div>
        </div>
        {brand === false && (
          <p className="rounded-xl bg-brand-sun/40 p-3 text-sm">
            Logo e fachada são do <b>plano com personalização</b>. <a className="font-bold underline" href="https://wa.me/5574999134241?text=Quero%20o%20plano%20com%20personaliza%C3%A7%C3%A3o%20do%20Comanda" target="_blank" rel="noreferrer">Fale com a gente para liberar</a>.
          </p>
        )}
        {brand && <p className="text-xs text-ink/60">Depois de escolher as imagens, toque em “Salvar alterações”.</p>}
      </section>

      <section className="card grid gap-4 p-4">
        <h2 className="font-bold">Seu negócio</h2>
        <div><label className="label">Nome</label><input disabled={dis} className="input" value={b.name} maxLength={80} onChange={(e) => set('name', e.target.value)} /></div>
        <div><label className="label">Descrição curta</label><textarea disabled={dis} className="input" rows={2} maxLength={500} value={b.description ?? ''} onChange={(e) => set('description', e.target.value)} /></div>
        <div><label className="label">WhatsApp da loja (com DDD)</label><input disabled={dis} className="input" inputMode="tel" placeholder="(71) 99999-9999" value={b.whatsapp_contact} onChange={(e) => set('whatsapp_contact', e.target.value)} /></div>
        <div><label className="label">Endereço</label><input disabled={dis} className="input" value={b.address_text ?? ''} onChange={(e) => set('address_text', e.target.value)} /></div>
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2"><label className="label">Cidade</label><input disabled={dis} className="input" value={b.city ?? ''} onChange={(e) => set('city', e.target.value)} /></div>
          <div><label className="label">UF</label><input disabled={dis} className="input" maxLength={2} value={b.state ?? ''} onChange={(e) => set('state', e.target.value.toUpperCase())} /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">Pedido mínimo (R$)</label><input disabled={dis} className="input" inputMode="decimal" value={b.min_order} onChange={(e) => set('min_order', e.target.value)} /></div>
          <div><label className="label">Tempo de preparo (min)</label><input disabled={dis} className="input" inputMode="numeric" value={b.prep_time_min} onChange={(e) => set('prep_time_min', e.target.value)} /></div>
        </div>
        <div className="grid gap-2 text-sm font-medium">
          {[['accepts_delivery', 'Aceito entregas'], ['accepts_pickup', 'Aceito retirada no balcão'], ['accept_when_closed', 'Aceitar pedidos mesmo fora do horário']].map(([k, l]) => (
            <label key={k} className="flex items-center gap-3"><input disabled={dis} type="checkbox" className="h-5 w-5 accent-brand" checked={!!b[k]} onChange={(e) => set(k, e.target.checked)} />{l}</label>
          ))}
        </div>
      </section>

      <section className="card grid gap-3 p-4">
        <h2 className="font-bold">Pedidos agendados</h2>
        <label className="flex items-center gap-3 text-sm font-medium">
          <input disabled={dis} type="checkbox" className="h-5 w-5 accent-brand" checked={!!b.accepts_scheduling} onChange={(e) => set('accepts_scheduling', e.target.checked)} />
          Aceitar pedidos agendados (o cliente escolhe dia e horário)
        </label>
        {b.accepts_scheduling && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Antecedência mínima (min)</label>
              <input disabled={dis} className="input" inputMode="numeric" value={b.schedule_min_minutes ?? 30} onChange={(e) => set('schedule_min_minutes', e.target.value)} />
            </div>
            <div>
              <label className="label">Agendar até (dias)</label>
              <input disabled={dis} className="input" inputMode="numeric" value={b.schedule_max_days ?? 7} onChange={(e) => set('schedule_max_days', e.target.value)} />
            </div>
          </div>
        )}
        <p className="text-xs text-ink/60">O cliente só vê horários dentro do seu horário de funcionamento (abaixo). Sem horários cadastrados, valem 8h às 22h.</p>
      </section>

      <section className="card p-4">
        <h2 className="font-bold">Horário de funcionamento</h2>
        <p className="mb-3 text-sm text-ink/60">Sem nenhum dia marcado, a loja fica sempre aberta. Para fechar depois da meia-noite, use um fechamento menor que a abertura (ex.: 18:00 às 02:00).</p>
        <div className="grid gap-2">
          {days.map((d, i) => (
            <div key={i} className="flex flex-wrap items-center gap-3">
              <label className="flex w-28 items-center gap-2 text-sm font-semibold">
                <input disabled={dis} type="checkbox" className="h-5 w-5 accent-brand" checked={d.on} onChange={(e) => setDays((p) => p.map((x, j) => (j === i ? { ...x, on: e.target.checked } : x)))} />
                {WEEKDAYS[i]}
              </label>
              {d.on && (
                <>
                  <input disabled={dis} type="time" className="input w-32" value={d.opens} onChange={(e) => setDays((p) => p.map((x, j) => (j === i ? { ...x, opens: e.target.value } : x)))} />
                  <span className="text-sm text-ink/50">às</span>
                  <input disabled={dis} type="time" className="input w-32" value={d.closes} onChange={(e) => setDays((p) => p.map((x, j) => (j === i ? { ...x, closes: e.target.value } : x)))} />
                </>
              )}
            </div>
          ))}
        </div>
      </section>

      {canEdit && (
        <div className="sticky bottom-3 z-10 flex items-center gap-3">
          <button className="btn-primary flex-1 shadow-lg" disabled={busy} onClick={save}>{busy ? 'Salvando…' : 'Salvar alterações'}</button>
        </div>
      )}
      {err && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{err}</p>}
      {msg && <p className="rounded-xl bg-green-50 p-3 text-sm text-green-800">{msg}</p>}

      <section className="card p-4">
        <h2 className="font-bold">Endereço da loja</h2>
        <p className="mb-3 text-sm text-ink/60">É o link que você envia aos clientes.</p>
        <p className="mb-2 break-all rounded-xl bg-sand p-3 text-sm font-semibold">{storeUrl(slugInput ?? b.slug)}</p>
        {canEdit && (
          <div className="flex gap-2">
            <input className="input" maxLength={40} autoCapitalize="none" value={slugInput ?? b.slug} onChange={(e) => setSlugInput(e.target.value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/-{2,}/g, '-').replace(/^-/, '').slice(0, 40))} placeholder="nome-da-loja" />
            <button className="btn-ghost btn-sm shrink-0" disabled={busy || (slugInput ?? b.slug) === b.slug || (slugInput ?? '').length < 3} onClick={changeSlug}>Alterar endereço</button>
          </div>
        )}
      </section>

      <section className="card p-4">
        <h2 className="font-bold">Pagamento online (Pix)</h2>
        {mpOn ? (
          <>
            <p className="mt-2 rounded-xl bg-green-50 p-3 text-sm text-green-800">✅ Mercado Pago conectado. Seus clientes podem pagar com Pix na hora do pedido, e o dinheiro cai direto na sua conta do Mercado Pago.</p>
            {canEdit && <button className="mt-3 text-sm text-red-700 underline" onClick={disconnectMp}>Desconectar Mercado Pago</button>}
          </>
        ) : (
          <>
            <p className="mb-3 text-sm text-ink/60">Conecte a sua conta do Mercado Pago para receber Pix. O cliente paga ao finalizar e o pedido só chega para você depois de pago.</p>
            <ol className="mb-3 list-decimal space-y-1 pl-5 text-sm text-ink/70">
              <li>Entre em <b>mercadopago.com.br/developers</b> com a conta que vai receber.</li>
              <li>Em <b>Suas integrações</b>, crie uma aplicação (tipo “Pagamentos online”).</li>
              <li>Abra <b>Credenciais de produção</b> e copie o <b>Access Token</b>.</li>
              <li>Cole abaixo e toque em Conectar.</li>
            </ol>
            {canEdit && (
              <div className="flex gap-2">
                <input className="input" type="password" autoComplete="off" placeholder="APP_USR-…" value={mpToken} onChange={(e) => setMpToken(e.target.value)} />
                <button className="btn-primary btn-sm shrink-0" disabled={mpBusy} onClick={connectMp}>{mpBusy ? 'Conectando…' : 'Conectar'}</button>
              </div>
            )}
          </>
        )}
      </section>

      <section className="card p-4">
        <h2 className="font-bold">Atendente de WhatsApp (IA)</h2>
        {wa ? (
          <>
            <p className="mt-2 rounded-xl bg-green-50 p-3 text-sm text-green-800">✅ WhatsApp conectado{wa.display_phone ? ` (${wa.display_phone})` : ''}. O atendente responde, anota o pedido e envia o Pix.</p>
            {canEdit && (
              <div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
                <label className="flex items-center gap-2 font-semibold"><input type="checkbox" checked={wa.bot_enabled} onChange={(e) => toggleWaBot(e.target.checked)} /> Atendente automático ligado</label>
                <button className="text-red-700 underline" onClick={disconnectWa}>Desconectar WhatsApp</button>
              </div>
            )}
          </>
        ) : (
          <>
            <p className="mb-3 text-sm text-ink/60">Conecte o número de WhatsApp da loja (API oficial da Meta). O cliente conversa por texto ou áudio, escolhe os produtos, paga e o pedido cai no seu painel.</p>
            {canEdit && (
              <div className="space-y-2">
                <input className="input" inputMode="numeric" placeholder="ID do número de telefone (Phone number ID)" value={waPid} onChange={(e) => setWaPid(e.target.value)} />
                <input className="input" inputMode="numeric" placeholder="ID da conta do WhatsApp Business (opcional)" value={waWaba} onChange={(e) => setWaWaba(e.target.value)} />
                <div className="flex gap-2">
                  <input className="input" type="password" autoComplete="off" placeholder="Token de acesso permanente" value={waToken} onChange={(e) => setWaToken(e.target.value)} />
                  <button className="btn-primary btn-sm shrink-0" disabled={waBusy} onClick={connectWa}>{waBusy ? 'Conectando…' : 'Conectar'}</button>
                </div>
              </div>
            )}
          </>
        )}
      </section>

      <section className="card p-4">
        <h2 className="font-bold">Nomes para importar fotos</h2>
        <p className="mb-3 text-sm text-ink/60">Modelo para renomear as imagens antes de usar “Importar fotos” no Cardápio.</p>
        <PhotoNames businessId={businessId} />
      </section>

      <section className="card p-4">
        <h2 className="font-bold">Regiões de entrega e taxas</h2>
        <div className="my-3 grid grid-cols-2 gap-2">
          <button type="button" disabled={!canEdit} onClick={() => setMode('zones')} className={`rounded-xl border px-3 py-2 text-sm font-semibold ${!kmMode ? 'border-brand bg-brand/10' : 'border-sand bg-white'}`}>Por bairro</button>
          <button type="button" disabled={!canEdit} onClick={() => setMode('km')} className={`rounded-xl border px-3 py-2 text-sm font-semibold ${kmMode ? 'border-brand bg-brand/10' : 'border-sand bg-white'}`}>Por distância (km)</button>
        </div>
        {kmMode ? (
          <>
            <p className="mb-3 text-sm text-ink/60">O cliente informa o CEP e o número; calculamos a distância em linha reta até a loja e cobramos a faixa correspondente. Fora da última faixa, não entregamos.</p>
            <div className="mb-3 rounded-xl bg-sand p-3 text-sm">
              <p className="font-semibold">Localização da loja</p>
              {b.store_lat != null && b.store_lng != null ? (
                <p className="mt-1 text-ink/70">Localizada. <a className="underline" target="_blank" rel="noreferrer" href={`https://www.openstreetmap.org/?mlat=${b.store_lat}&mlon=${b.store_lng}#map=17/${b.store_lat}/${b.store_lng}`}>Ver no mapa</a></p>
              ) : (
                <p className="mt-1 text-red-700">Ainda não localizada. Sem isso o cálculo não funciona.</p>
              )}
              {canEdit && <button className="btn-ghost btn-sm mt-2" disabled={busy} onClick={locateStore}>📍 Localizar loja pelo endereço cadastrado</button>}
            </div>
            <ul className="divide-y divide-sand text-sm">
              {zones.filter((z) => z.max_km != null).sort((a, c) => (a.max_km ?? 0) - (c.max_km ?? 0)).map((z) => (
                <li key={z.id} className="flex items-center justify-between py-2">
                  <span className="font-medium">{z.name} <span className="text-ink/60">— {z.fee > 0 ? brl(z.fee) : 'Grátis'}</span></span>
                  {canEdit && <button onClick={() => delZone(z.id)} className="text-red-700 underline">Apagar</button>}
                </li>
              ))}
              {zones.filter((z) => z.max_km != null).length === 0 && <li className="py-2 text-ink/60">Nenhuma faixa cadastrada.</li>}
            </ul>
            {canEdit && (
              <div className="mt-3 flex gap-2">
                <input className="input max-w-[7rem]" placeholder="Até km" inputMode="decimal" value={bKm} onChange={(e) => setBKm(e.target.value)} />
                <input className="input max-w-[7rem]" placeholder="Taxa R$" inputMode="decimal" value={bFee} onChange={(e) => setBFee(e.target.value)} />
                <button className="btn-ghost btn-sm shrink-0" onClick={addBand}>Adicionar faixa</button>
              </div>
            )}
          </>
        ) : (
          <>
            <p className="mb-3 text-sm text-ink/60">Se você cadastrar regiões, o cliente precisa escolher uma na hora do pedido. Sem regiões, a entrega não tem taxa.</p>
            <ul className="divide-y divide-sand text-sm">
              {zones.filter((z) => z.max_km == null).map((z) => (
                <li key={z.id} className="flex items-center justify-between py-2">
                  <span className="font-medium">{z.name} <span className="text-ink/60">— {z.fee > 0 ? brl(z.fee) : 'Grátis'}</span></span>
                  {canEdit && <button onClick={() => delZone(z.id)} className="text-red-700 underline">Apagar</button>}
                </li>
              ))}
              {zones.filter((z) => z.max_km == null).length === 0 && <li className="py-2 text-ink/60">Nenhuma região cadastrada.</li>}
            </ul>
            {canEdit && (
              <div className="mt-3 flex gap-2">
                <input className="input" placeholder="Bairro (vários: Pituba, Itaigara)" value={zName} onChange={(e) => setZName(e.target.value)} maxLength={80} />
                <input className="input max-w-[7rem]" placeholder="Taxa R$" inputMode="decimal" value={zFee} onChange={(e) => setZFee(e.target.value)} />
                <button className="btn-ghost btn-sm shrink-0" onClick={addZone}>Adicionar</button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
