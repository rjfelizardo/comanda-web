'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { uploadImage } from '@/lib/upload';
import { brl } from '@/lib/format';
import MenuImport from '@/components/painel/MenuImport';
import PhotoImport from '@/components/painel/PhotoImport';

type Cat = { id: string; name: string; sort_order: number };
type Opt = { id: string; group_id: string; name: string; price_delta: number; is_available: boolean; flavors?: number };
type Grp = { id: string; product_id: string; name: string; min_select: number; max_select: number };
type Prod = { id: string; category_id: string | null; name: string; description: string | null; base_price: number; photo_url: string | null; is_available: boolean; allow_half?: boolean };

const num = (s: string) => {
  const n = Number(String(s).replace(',', '.'));
  return Number.isFinite(n) && n >= 0 ? n : NaN;
};

export default function CatalogManager({ businessId, canEdit }: { businessId: string; canEdit: boolean }) {
  const [cats, setCats] = useState<Cat[]>([]);
  const [prods, setProds] = useState<Prod[]>([]);
  const [groups, setGroups] = useState<Grp[]>([]);
  const [opts, setOpts] = useState<Opt[]>([]);
  const [editing, setEditing] = useState<Prod | 'new' | null>(null);
  const [newCat, setNewCat] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [photoImp, setPhotoImp] = useState(false);

  const load = useCallback(async () => {
    const s = supabaseBrowser();
    const [c, p, g, o] = await Promise.all([
      s.from('categories').select('id,name,sort_order').eq('business_id', businessId).order('sort_order').order('name'),
      (async () => {
        const q = (cols: string) => s.from('products').select(cols).eq('business_id', businessId).order('sort_order').order('name');
        const r = await q('id,category_id,name,description,base_price,photo_url,is_available,allow_half');
        return r.error ? q('id,category_id,name,description,base_price,photo_url,is_available') : r;
      })(),
      s.from('product_option_groups').select('id,product_id,name,min_select,max_select').eq('business_id', businessId).order('sort_order'),
      (async () => {
        const q = (cols: string) => s.from('product_options').select(cols).eq('business_id', businessId).order('sort_order');
        const r = await q('id,group_id,name,price_delta,is_available,flavors');
        return r.error ? q('id,group_id,name,price_delta,is_available') : r;
      })(),
    ]);
    if (c.error || p.error) setError('Não foi possível carregar o cardápio.');
    setCats((c.data ?? []) as Cat[]);
    setProds(((p.data ?? []) as any[]).map((x) => ({ ...x, base_price: Number(x.base_price) })));
    setGroups((g.data ?? []) as Grp[]);
    setOpts(((o.data ?? []) as any[]).map((x) => ({ ...x, price_delta: Number(x.price_delta) })));
    setLoading(false);
  }, [businessId]);

  useEffect(() => { load(); }, [load]);

  async function addCat(e: React.FormEvent) {
    e.preventDefault();
    if (!newCat.trim()) return;
    const { error } = await supabaseBrowser().from('categories').insert({ business_id: businessId, name: newCat.trim(), sort_order: cats.length });
    if (error) setError(error.code === '23505' ? 'Já existe uma categoria com esse nome.' : 'Não foi possível criar a categoria.');
    else { setNewCat(''); setError(''); }
    load();
  }

  async function delCat(c: Cat) {
    if (!confirm(`Apagar a categoria “${c.name}”? Os produtos ficam sem categoria.`)) return;
    await supabaseBrowser().from('categories').delete().eq('id', c.id);
    load();
  }

  async function toggle(p: Prod) {
    await supabaseBrowser().from('products').update({ is_available: !p.is_available }).eq('id', p.id);
    load();
  }

  if (loading) return <p className="py-10 text-center text-ink/50">Carregando…</p>;

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold">Cardápio</h1>
        {canEdit && (
          <div className="flex flex-wrap gap-2">
            <button className="btn-ghost btn-sm" onClick={() => setImporting(true)}>📥 Importar planilha</button>
            <button className="btn-ghost btn-sm" onClick={() => setPhotoImp(true)}>🖼 Importar fotos</button>
            <button className="btn-primary btn-sm" onClick={() => setEditing('new')}>+ Novo produto</button>
          </div>
        )}
      </div>
      {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {photoImp && <PhotoImport businessId={businessId} products={prods.map((p) => ({ id: p.id, name: p.name, photo_url: p.photo_url }))} onClose={() => setPhotoImp(false)} onDone={load} />}
      {importing && <MenuImport businessId={businessId} onClose={() => setImporting(false)} onDone={load} />}

      <section className="card p-4">
        <h2 className="mb-3 font-bold">Categorias</h2>
        <div className="flex flex-wrap gap-2">
          {cats.map((c) => (
            <span key={c.id} className="chip gap-2 bg-sand py-1.5 text-sm">
              {c.name}
              {canEdit && <button onClick={() => delCat(c)} aria-label={`Apagar ${c.name}`} className="text-ink/50">✕</button>}
            </span>
          ))}
          {cats.length === 0 && <p className="text-sm text-ink/60">Crie categorias como “Pizzas”, “Bebidas”, “Sobremesas”.</p>}
        </div>
        {canEdit && (
          <form onSubmit={addCat} className="mt-3 flex gap-2">
            <input className="input min-w-0 flex-1" placeholder="Nova categoria" value={newCat} onChange={(e) => setNewCat(e.target.value)} maxLength={80} />
            <button className="btn-ghost shrink-0">Adicionar</button>
          </form>
        )}
      </section>

      <section className="grid grid-cols-[minmax(0,1fr)] gap-3">
        {prods.length === 0 && <div className="card p-10 text-center text-ink/60">Nenhum produto ainda. Clique em “Novo produto” para começar.</div>}
        {prods.map((p) => (
          <div key={p.id} className={`card flex flex-col gap-3 p-3 sm:flex-row sm:items-center ${p.is_available ? '' : 'opacity-60'}`}>
            <div className="flex min-w-0 flex-1 items-start gap-3">
            {p.photo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.photo_url} alt="" className="h-16 w-16 shrink-0 rounded-xl object-cover" />
            ) : (
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-sand text-2xl">🍽️</div>
            )}
            <div className="min-w-0 flex-1">
              <p className="break-words font-bold leading-snug">{p.name}</p>
              <p className="text-sm text-ink/60">
                {cats.find((c) => c.id === p.category_id)?.name ?? 'Sem categoria'} · {p.base_price > 0 ? brl(p.base_price) : 'preço nas opções'}
                {groups.filter((g) => g.product_id === p.id).length > 0 && ` · ${groups.filter((g) => g.product_id === p.id).length} grupo(s) de opções`}
              </p>
            </div>
            </div>
            {canEdit && (
              <div className="flex shrink-0 gap-2">
                <button className="btn-ghost btn-sm" onClick={() => toggle(p)}>{p.is_available ? 'Pausar' : 'Ativar'}</button>
                <button className="btn-ghost btn-sm" onClick={() => setEditing(p)}>Editar</button>
              </div>
            )}
          </div>
        ))}
      </section>

      {editing && (
        <ProductEditor
          businessId={businessId}
          product={editing === 'new' ? null : editing}
          cats={cats}
          groups={editing === 'new' ? [] : groups.filter((g) => g.product_id === editing.id)}
          opts={opts}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
          reload={load}
        />
      )}
    </div>
  );
}

function ProductEditor({
  businessId, product, cats, groups, opts, onClose, onSaved, reload,
}: {
  businessId: string; product: Prod | null; cats: Cat[]; groups: Grp[]; opts: Opt[];
  onClose: () => void; onSaved: () => void; reload: () => void;
}) {
  const [name, setName] = useState(product?.name ?? '');
  const [desc, setDesc] = useState(product?.description ?? '');
  const [price, setPrice] = useState(product ? String(product.base_price).replace('.', ',') : '');
  const [cat, setCat] = useState(product?.category_id ?? '');
  const [photo, setPhoto] = useState(product?.photo_url ?? '');
  const [half, setHalf] = useState(!!product?.allow_half);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [gName, setGName] = useState('');
  const [gMin, setGMin] = useState('0');
  const [gMax, setGMax] = useState('1');

  async function pick(file?: File) {
    if (!file) return;
    setBusy(true);
    try { setPhoto(await uploadImage(businessId, file)); } catch { setError('Não foi possível enviar a foto.'); }
    setBusy(false);
  }

  async function save() {
    setError('');
    const p = price.trim() === '' ? 0 : num(price);
    if (name.trim().length < 1) return setError('Informe o nome do produto.');
    if (Number.isNaN(p)) return setError('Preço inválido.');
    setBusy(true);
    const s = supabaseBrowser();
    const row = { name: name.trim(), description: desc.trim() || null, base_price: p, category_id: cat || null, photo_url: photo || null, allow_half: half };
    const r = product ? await s.from('products').update(row).eq('id', product.id) : await s.from('products').insert({ ...row, business_id: businessId });
    setBusy(false);
    if (r.error) return setError('Não foi possível salvar.');
    onSaved();
  }

  async function remove() {
    if (!product || !confirm(`Apagar “${product.name}”?`)) return;
    await supabaseBrowser().from('products').delete().eq('id', product.id);
    onSaved();
  }

  async function addGroup() {
    if (!product) return;
    const mn = parseInt(gMin, 10), mx = parseInt(gMax, 10);
    if (!gName.trim() || Number.isNaN(mn) || Number.isNaN(mx) || mx < 1 || mn > mx) return setError('Revise o grupo: nome, mínimo e máximo.');
    const { error } = await supabaseBrowser().from('product_option_groups').insert({
      business_id: businessId, product_id: product.id, name: gName.trim(), min_select: mn, max_select: mx,
    });
    if (error) return setError('Não foi possível criar o grupo.');
    setGName(''); setGMin('0'); setGMax('1'); setError('');
    reload();
  }

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-ink/50 sm:items-center" onClick={onClose}>
      <div className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-t-3xl bg-white p-5 sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-extrabold">{product ? 'Editar produto' : 'Novo produto'}</h2>
          <button onClick={onClose} className="h-10 w-10 rounded-full bg-sand" aria-label="Fechar">✕</button>
        </div>

        <div className="grid gap-4">
          <div className="flex items-center gap-3">
            {photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photo} alt="" className="h-20 w-20 rounded-xl object-cover" />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-sand text-3xl">📷</div>
            )}
            <label className="btn-ghost btn-sm cursor-pointer">
              {photo ? 'Trocar foto' : 'Enviar foto'}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
            </label>
            {photo && <button className="text-sm text-ink/60 underline" onClick={() => setPhoto('')}>Remover</button>}
          </div>
          <div><label className="label">Nome</label><input className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} /></div>
          <div><label className="label">Descrição</label><textarea className="input" rows={2} value={desc} onChange={(e) => setDesc(e.target.value)} maxLength={600} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Preço base (R$)</label>
              <input className="input" inputMode="decimal" placeholder="0,00" value={price} onChange={(e) => setPrice(e.target.value)} />
              <p className="mt-1 text-xs text-ink/60">Se o preço muda por tamanho, deixe 0 e coloque o valor de cada tamanho nas opções.</p>
            </div>
            <div>
              <label className="label">Categoria</label>
              <select className="input" value={cat} onChange={(e) => setCat(e.target.value)}>
                <option value="">Sem categoria</option>
                {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
          <label className="flex items-center gap-3 text-sm font-semibold">
            <input type="checkbox" className="h-5 w-5 accent-brand" checked={half} onChange={(e) => setHalf(e.target.checked)} />
            🍕 Permite meio a meio (com outros produtos da mesma categoria que também permitem)
          </label>
          <p className="-mt-2 text-xs text-ink/50">Dica: se o preço depende do tamanho, deixe o preço base em 0 e cadastre o tamanho como grupo de opções.</p>

          {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
          <div className="flex gap-2">
            <button className="btn-primary flex-1" disabled={busy} onClick={save}>{busy ? 'Salvando…' : 'Salvar'}</button>
            {product && <button className="btn-danger" onClick={remove}>Apagar</button>}
          </div>

          <hr className="border-sand" />
          <div>
            <h3 className="font-bold">Opções (tamanho, sabor, adicionais)</h3>
            {!product && <p className="mt-1 text-sm text-ink/60">Salve o produto primeiro para cadastrar opções.</p>}
            {product && (
              <>
                {groups.map((g) => (
                  <GroupBox key={g.id} g={g} opts={opts.filter((o) => o.group_id === g.id)} businessId={businessId} reload={reload} showFlavors={half} />
                ))}
                <div className="mt-3 grid gap-2 rounded-xl bg-sand/60 p-3">
                  <p className="text-sm font-semibold">Novo grupo</p>
                  <input className="input" placeholder="Ex.: Tamanho" value={gName} onChange={(e) => setGName(e.target.value)} maxLength={80} />
                  <div className="grid grid-cols-2 gap-2">
                    <div><label className="label">Mínimo (0 = opcional)</label><input className="input" inputMode="numeric" value={gMin} onChange={(e) => setGMin(e.target.value)} /></div>
                    <div><label className="label">Máximo</label><input className="input" inputMode="numeric" value={gMax} onChange={(e) => setGMax(e.target.value)} /></div>
                  </div>
                  <button className="btn-ghost btn-sm" onClick={addGroup}>Adicionar grupo</button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function GroupBox({ g, opts, businessId, reload, showFlavors }: { g: Grp; opts: Opt[]; businessId: string; reload: () => void; showFlavors?: boolean }) {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [err, setErr] = useState('');

  async function add() {
    const p = price.trim() === '' ? 0 : num(price);
    if (!name.trim() || Number.isNaN(p)) return setErr('Informe nome e preço válido.');
    const { error } = await supabaseBrowser().from('product_options').insert({ business_id: businessId, group_id: g.id, name: name.trim(), price_delta: p });
    if (error) return setErr('Não foi possível adicionar.');
    setName(''); setPrice(''); setErr('');
    reload();
  }
  async function setFlavors(id: string, n: number) {
    const { error } = await supabaseBrowser().from('product_options').update({ flavors: n }).eq('id', id);
    if (error) setErr('Rode o SQL 07 no Supabase para configurar sabores.');
    else reload();
  }
  async function delOpt(id: string) {
    await supabaseBrowser().from('product_options').delete().eq('id', id);
    reload();
  }
  async function delGroup() {
    if (!confirm(`Apagar o grupo “${g.name}” e suas opções?`)) return;
    await supabaseBrowser().from('product_option_groups').delete().eq('id', g.id);
    reload();
  }

  return (
    <div className="mt-3 rounded-xl border border-sand p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="font-semibold">
          {g.name} <span className="text-xs font-normal text-ink/60">({g.min_select > 0 ? 'obrigatório' : 'opcional'}, até {g.max_select})</span>
        </p>
        <button className="text-sm text-red-700 underline" onClick={delGroup}>Apagar grupo</button>
      </div>
      <ul className="mt-2 divide-y divide-sand text-sm">
        {opts.map((o) => (
          <li key={o.id} className="flex items-center justify-between py-1.5">
            <span>{o.name} {o.price_delta > 0 && <span className="text-ink/60">+ {brl(o.price_delta)}</span>}</span>
            <span className="flex items-center gap-2">
              {showFlavors && (
                <select className="rounded-lg border border-sand bg-white px-1 py-1 text-xs" value={o.flavors ?? 2} onChange={(e) => setFlavors(o.id, Number(e.target.value))} aria-label={`Sabores em ${o.name}`}>
                  <option value={1}>1 sabor</option>
                  <option value={2}>até 2 sabores</option>
                  <option value={3}>até 3 sabores</option>
                  <option value={4}>até 4 sabores</option>
                </select>
              )}
              <button onClick={() => delOpt(o.id)} className="text-ink/50" aria-label={`Apagar ${o.name}`}>✕</button>
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-2 flex gap-2">
        <input className="input" placeholder="Opção (ex.: Grande)" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
        <input className="input max-w-[7rem]" placeholder="Valor R$ (soma ao base)" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} />
        <button className="btn-ghost btn-sm shrink-0" onClick={add}>+</button>
      </div>
      {err && <p className="mt-1 text-sm text-red-700">{err}</p>}
    </div>
  );
}
