'use client';

import { useEffect, useMemo, useState } from 'react';
import { brl, onlyDigits } from '@/lib/format';
import MyOrders, { saveEntry } from '@/components/MyOrders';
import { daySlots, scheduleDays } from '@/lib/slots';
import { couponRule, couponTitle } from '@/lib/coupons';
import type { Business, CartLine, Category, Hours, Product, PublicCoupon, Zone } from '@/lib/types';

type Props = {
  business: Business;
  categories: Category[];
  products: Product[];
  zones: Zone[];
  isOpen: boolean;
  hours: Hours[];
  coupons?: PublicCoupon[];
};

export default function Store({ business, categories, products, zones, isOpen, hours, coupons = [] }: Props) {
  const storageKey = `comanda-cart-${business.id}`;
  const [cart, setCart] = useState<CartLine[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [picked, setPicked] = useState<Product | null>(null);
  const [checkout, setCheckout] = useState(false);
  const [done, setDone] = useState<{ code: string; total: number } | null>(null);
  const [activeCat, setActiveCat] = useState<string>('');
  const [ordersOpen, setOrdersOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [feeOpen, setFeeOpen] = useState(false);
  const [couponsOpen, setCouponsOpen] = useState(false);
  const [toast, setToast] = useState('');
  const [myZoneId, setMyZoneId] = useState('');
  useEffect(() => {
    try { setMyZoneId(localStorage.getItem(`comanda-zona-${business.id}`) || ''); } catch {}
  }, [business.id]);
  const myZone = zones.find((z) => z.id === myZoneId);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) setCart(JSON.parse(raw));
    } catch {}
    setLoaded(true);
  }, [storageKey]);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(cart));
    } catch {}
  }, [cart, loaded, storageKey]);

  const sections = useMemo(() => {
    const out = categories
      .map((c) => ({ id: c.id, name: c.name, items: products.filter((p) => p.category_id === c.id) }))
      .filter((s) => s.items.length > 0);
    const loose = products.filter((p) => !p.category_id || !categories.some((c) => c.id === p.category_id));
    if (loose.length) out.push({ id: 'outros', name: 'Outros', items: loose });
    return out;
  }, [categories, products]);

  const fold = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const searching = query.trim().length > 0;
  const visible = useMemo(() => {
    if (!searching) return sections;
    const q = fold(query.trim());
    return sections
      .map((s) => ({ ...s, items: s.items.filter((p) => fold(p.name + ' ' + (p.description ?? '')).includes(q)) }))
      .filter((s) => s.items.length > 0);
  }, [sections, query, searching]);

  useEffect(() => {
    if (searching || sections.length < 2) return;
    const onScroll = () => {
      let cur = sections[0].id;
      for (const sec of sections) {
        const el = document.getElementById(`cat-${sec.id}`);
        if (el && el.getBoundingClientRect().top <= 160) cur = sec.id;
      }
      setActiveCat(cur);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [sections, searching]);

  const subtotal = cart.reduce((s, l) => s + l.unit_price * l.quantity, 0);
  const count = cart.reduce((s, l) => s + l.quantity, 0);

  function addLine(line: CartLine) {
    setCart((prev) => {
      const same = prev.find((l) => l.key === line.key);
      if (same) return prev.map((l) => (l.key === line.key ? { ...l, quantity: l.quantity + line.quantity } : l));
      return [...prev, line];
    });
  }

  function scrollTo(id: string) {
    setActiveCat(id);
    document.getElementById(`cat-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  if (done) return <Success business={business} code={done.code} total={done.total} onTrack={() => { setDone(null); setOrdersOpen(true); }} />;

  return (
    <div className="mx-auto min-h-screen max-w-6xl pb-28">
      {/* Capa */}
      <div className="relative h-40 overflow-hidden bg-gradient-to-br from-brand-light via-brand to-brand-dark sm:h-52">
        {business.banner_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={business.banner_url} alt="" className="h-full w-full object-cover" />
        )}
      </div>

      <header className="relative -mt-10 px-4">
        <div className="card flex items-center gap-4 p-4">
          {business.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={business.logo_url} alt="" className="h-16 w-16 rounded-2xl object-cover" />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-sun text-2xl font-extrabold">
              {business.name.slice(0, 1).toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl font-extrabold">{business.name}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-ink/70">
              <span className={`chip ${isOpen ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {isOpen ? 'Aberto' : 'Fechado'}
              </span>
              <span>~{business.prep_time_min} min</span>
              {business.min_order > 0 && <span>Mín. {brl(business.min_order)}</span>}
            </div>
          </div>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {coupons.length > 0 && (
            <button onClick={() => setCouponsOpen(true)} className="btn-primary btn-sm w-full">🎟 Cupons ({coupons.length})</button>
          )}
          {zones.length > 0 && business.accepts_delivery ? (
            <button onClick={() => setFeeOpen(true)} className="btn-ghost btn-sm w-full">
              📍 {myZone ? `${myZone.name}: ${myZone.fee > 0 ? brl(myZone.fee) : 'entrega grátis'}${myZone.eta_min ? ` · ~${myZone.eta_min} min` : ''}` : 'Calcular taxa e tempo de entrega'}
            </button>
          ) : <span />}
          <button onClick={() => setOrdersOpen(true)} className="btn-ghost btn-sm w-full">🧾 Meus pedidos</button>
        </div>
        {business.description && <p className="mt-3 text-sm text-ink/70">{business.description}</p>}
        {!isOpen && (
          <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-800">
            A loja está fechada agora. Você pode olhar o cardápio, mas não é possível enviar pedidos.
          </p>
        )}
      </header>

      {/* Busca + categorias */}
      <div className="sticky top-0 z-10 mt-4 bg-cream/95 backdrop-blur">
        <div className="px-4 pt-3">
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/40" aria-hidden>🔍</span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar no cardápio"
              aria-label="Buscar no cardápio"
              className="input pl-10"
            />
          </div>
        </div>
        {!searching && sections.length > 1 && (
          <nav className="flex gap-2 overflow-x-auto px-4 py-3">
            {sections.map((s) => (
              <button
                key={s.id}
                onClick={() => scrollTo(s.id)}
                className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold ${
                  activeCat === s.id ? 'bg-ink text-white' : 'bg-white text-ink shadow-card'
                }`}
              >
                {s.name}
              </button>
            ))}
          </nav>
        )}
        {(searching || sections.length <= 1) && <div className="h-3" />}
      </div>

      {/* Cardápio */}
      <main className="mt-2 px-4">
        {sections.length === 0 && (
          <p className="py-16 text-center text-ink/60">O cardápio ainda está sendo preparado. Volte em breve.</p>
        )}
        {searching && visible.length === 0 && (
          <p className="py-16 text-center text-ink/60">Nenhum item encontrado para “{query}”.</p>
        )}
        {visible.map((s) => (
          <section key={s.id} id={`cat-${s.id}`} className="scroll-mt-32 pt-4">
            <h2 className="mb-3 text-lg font-extrabold">{s.name}</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {s.items.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPicked(p)}
                  className="card flex items-stretch gap-3 p-2 text-left transition active:scale-[.99]"
                >
                  {p.photo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.photo_url} alt="" loading="lazy" className="h-24 w-24 shrink-0 rounded-xl object-cover" />
                  ) : (
                    <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sand to-brand-sun/40 text-3xl" aria-hidden>🍽️</div>
                  )}
                  <div className="flex min-w-0 flex-1 flex-col py-1 pr-1">
                    <h3 className="line-clamp-2 text-[15px] font-bold leading-tight">{p.name}</h3>
                    {p.description && <p className="mt-0.5 line-clamp-2 text-xs text-ink/60">{p.description}</p>}
                    <p className="mt-auto pt-1 text-sm font-bold text-brand-dark">
                      {p.groups.length > 0 && p.base_price > 0 ? 'a partir de ' : ''}
                      {p.base_price > 0 ? brl(p.base_price) : minFromOptions(p)}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </section>
        ))}
      </main>

      {/* Barra do carrinho */}
      {count > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-20 p-4">
          <button onClick={() => setCheckout(true)} className="btn-primary mx-auto flex w-full max-w-2xl justify-between">
            <span className="rounded-full bg-white/25 px-3 py-0.5 text-sm">{count}</span>
            <span>Ver carrinho</span>
            <span>{brl(subtotal)}</span>
          </button>
        </div>
      )}

      {picked && (
        <ProductSheet
          product={picked}
          halves={picked.allow_half ? products.filter((p) => p.allow_half && p.id !== picked.id && p.groups.length > 0) : []}
          onClose={() => setPicked(null)}
          onAdd={(l) => {
            addLine(l);
            setPicked(null);
          }}
        />
      )}

      {couponsOpen && (
        <Sheet title="Cupons da loja" onClose={() => setCouponsOpen(false)}>
          <div className="grid gap-3">
            {coupons.map((c) => (
              <div key={c.code} className="flex items-center justify-between gap-3 rounded-2xl border border-dashed border-brand p-3">
                <div className="min-w-0">
                  <p className="font-display text-lg font-extrabold tracking-wider">{c.code}</p>
                  <p className="text-sm font-semibold">{couponTitle(c)}</p>
                  {couponRule(c) && <p className="text-xs text-ink/60">{couponRule(c)}</p>}
                </div>
                <button
                  className="btn-primary btn-sm shrink-0"
                  onClick={() => {
                    try { localStorage.setItem(`comanda-cupom-${business.id}`, c.code); } catch {}
                    setCouponsOpen(false);
                    setToast(`Cupom ${c.code} guardado. Ele será aplicado no seu carrinho.`);
                    setTimeout(() => setToast(''), 4000);
                  }}
                >
                  Usar
                </button>
              </div>
            ))}
          </div>
        </Sheet>
      )}

      {toast && (
        <div role="status" className="fixed inset-x-4 bottom-24 z-40 mx-auto max-w-md rounded-xl bg-ink px-4 py-3 text-center text-sm font-semibold text-white shadow-lg">{toast}</div>
      )}

      {feeOpen && (
        <Sheet title="Taxa e tempo de entrega" onClose={() => setFeeOpen(false)}>
          <p className="mb-3 text-sm text-ink/70">Escolha seu bairro ou região para ver a taxa e o tempo estimado. Ficamos com essa escolha para o seu pedido.</p>
          <div className="grid gap-2">
            {zones.map((z) => (
              <button
                key={z.id}
                onClick={() => { setMyZoneId(z.id); try { localStorage.setItem(`comanda-zona-${business.id}`, z.id); } catch {} setFeeOpen(false); }}
                className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left ${myZoneId === z.id ? 'border-brand bg-brand/10' : 'border-sand bg-white'}`}
              >
                <span className="font-medium">{z.name}{z.min_order > 0 && <span className="block text-xs text-ink/60">Pedido mínimo {brl(z.min_order)}</span>}</span>
                <span className="text-right text-sm"><b>{z.fee > 0 ? brl(z.fee) : 'Grátis'}</b><span className="block text-ink/60">~{z.eta_min ?? business.prep_time_min + 15} min</span></span>
              </button>
            ))}
          </div>
        </Sheet>
      )}

      {ordersOpen && <MyOrders businessId={business.id} whatsapp={business.whatsapp_contact} onClose={() => setOrdersOpen(false)} />}

      {checkout && (
        <Checkout
          business={business}
          zones={zones}
          hours={hours}
          coupons={coupons}
          cart={cart}
          setCart={setCart}
          isOpen={isOpen}
          onClose={() => setCheckout(false)}
          onDone={(r) => {
            setCart([]);
            setCheckout(false);
            setDone(r);
          }}
        />
      )}
    </div>
  );
}

function minFromOptions(p: Product) {
  const mins = p.groups.filter((g) => g.min_select > 0).map((g) => Math.min(...g.options.map((o) => o.price_delta)));
  const total = mins.reduce((a, b) => a + b, 0);
  return total > 0 ? `a partir de ${brl(total)}` : 'Consulte';
}

/* ---------- Escolha de opções do produto ---------- */
function ProductSheet({ product, halves, onClose, onAdd }: { product: Product; halves: Product[]; onClose: () => void; onAdd: (l: CartLine) => void }) {
  const [sel, setSel] = useState<Record<string, string[]>>({});
  const [qty, setQty] = useState(1);
  const [notes, setNotes] = useState('');
  const [extraIds, setExtraIds] = useState<string[]>([]);
  const [picking, setPicking] = useState(false);

  function toggle(gid: string, oid: string, max: number) {
    setSel((prev) => {
      const cur = prev[gid] ?? [];
      if (max === 1) return { ...prev, [gid]: cur[0] === oid ? [] : [oid] };
      if (cur.includes(oid)) return { ...prev, [gid]: cur.filter((x) => x !== oid) };
      if (cur.length >= max) return prev;
      return { ...prev, [gid]: [...cur, oid] };
    });
  }

  const chosen = product.groups.flatMap((g) => g.options.filter((o) => (sel[g.id] ?? []).includes(o.id)));
  const unit1 = product.base_price + chosen.reduce((s, o) => s + o.price_delta, 0);
  const missing = product.groups.find((g) => (sel[g.id]?.length ?? 0) < g.min_select);
  // total de sabores permitido pelo tamanho escolhido (sem tamanho escolhido: 2)
  const maxFlavors = chosen.length ? Math.max(...chosen.map((o) => o.flavors ?? 2)) : 2;
  const canHalf = halves.length > 0 && maxFlavors > 1;
  // fluxo MenuDino: sabor -> tamanho -> adicionar sabor / opcionais
  const primary = product.allow_half ? product.groups.find((g) => g.min_select === 1 && g.max_select === 1) : undefined;
  const primaryChosen = primary ? (sel[primary.id]?.length ?? 0) > 0 : true;
  const primaryOpt = primary ? primary.options.find((o) => (sel[primary.id] ?? []).includes(o.id)) : undefined;
  const maxExtra = maxFlavors - 1;

  // outro sabor: mesmas opcoes pelo nome (grupo + opcao); preco do sabor mais caro
  function priceOf(h: Product): number | null {
    let sum = h.base_price;
    for (const g of product.groups) {
      for (const o of g.options.filter((x) => (sel[g.id] ?? []).includes(x.id))) {
        const o2 = h.groups.find((x) => x.name.toLowerCase() === g.name.toLowerCase())?.options.find((x) => x.name.toLowerCase() === o.name.toLowerCase());
        if (!o2) return null;
        sum += o2.price_delta;
      }
    }
    return sum;
  }
  const available = halves.filter((h) => priceOf(h) !== null);
  const extras = extraIds.map((id) => halves.find((h) => h.id === id)).filter((h): h is Product => !!h && priceOf(h) !== null).slice(0, maxExtra);
  const total = extras.length + 1;
  const unit = Math.max(unit1, ...extras.map((h) => priceOf(h) ?? 0));
  const frac = total === 2 ? 'Meio' : `1/${total}`;
  const name = extras.length ? [product, ...extras].map((p) => `${frac} ${p.name}`).join(' / ') : product.name;

  function add() {
    if (missing) return;
    const ids = chosen.map((o) => o.id).sort();
    const hids = extras.map((h) => h.id);
    onAdd({
      key: `${product.id}|${hids.join('+')}|${ids.join(',')}|${notes.trim()}`,
      product_id: product.id,
      half_product_id: hids[0] ?? null,
      half_product_ids: hids,
      name,
      unit_price: unit,
      quantity: qty,
      option_ids: ids,
      option_labels: chosen.map((o) => o.name),
      notes: notes.trim(),
    });
  }

  if (picking) {
    return (
      <FlavorPicker
        title={`Escolha até ${maxFlavors} sabores`}
        subtitle={`${product.name} já é o 1º sabor. Você pode somar até ${maxExtra}.`}
        candidates={halves}
        sizeName={primaryOpt?.name}
        initial={extraIds}
        max={maxExtra}
        unitOf={(h) => priceOf(h)}
        onCancel={() => setPicking(false)}
        onConfirm={(ids) => { setExtraIds(ids); setPicking(false); }}
      />
    );
  }

  return (
    <Sheet onClose={onClose} title={product.name}>
      {product.photo_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={product.photo_url} alt="" className="mb-3 h-44 w-full rounded-2xl object-cover" />
      )}
      {product.description && <p className="mb-4 text-sm text-ink/70">{product.description}</p>}

      {primary && !primaryChosen && (
        <div className="mb-5">
          <p className="mb-3 font-bold">Selecione o {primary.name.toLowerCase()}:</p>
          <div className="flex flex-wrap justify-around gap-3">
            {primary.options.map((o) => (
              <button key={o.id} type="button" onClick={() => toggle(primary.id, o.id, 1)} className="flex w-20 flex-col items-center text-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-sand text-xl font-bold">{o.name.charAt(0).toUpperCase()}</span>
                <span className="mt-1 text-xs uppercase text-ink/70">{o.name}</span>
                <span className="text-sm font-bold">{brl(product.base_price + o.price_delta)}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      {primary && primaryChosen && primaryOpt && (
        <div className="mb-4 flex items-center justify-between rounded-xl bg-sand px-3 py-3">
          <span className="flex items-center gap-3 font-bold">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-ink text-white">{primaryOpt.name.charAt(0).toUpperCase()}</span>
            <span className="uppercase">{primaryOpt.name}</span>
          </span>
          <button className="text-sm underline" onClick={() => setSel((prev) => ({ ...prev, [primary.id]: [] }))}>✎ Alterar</button>
        </div>
      )}

      {primaryChosen && canHalf && (
        <div className="mb-5">
          <p className="mb-2 font-bold">Escolha até {maxFlavors} sabores <span className="font-normal text-ink/60">(opcional)</span></p>
          {extras.length > 0 && (
            <ul className="mb-2 divide-y divide-sand rounded-xl border border-sand text-sm">
              <li className="flex items-center justify-between px-3 py-2"><span className="font-medium">{product.name}</span><span className="text-ink/60">1º sabor</span></li>
              {extras.map((h) => (
                <li key={h.id} className="flex items-center justify-between px-3 py-2">
                  <span className="font-medium">{h.name}</span>
                  <button className="text-red-700 underline" onClick={() => setExtraIds((x) => x.filter((id) => id !== h.id))}>Remover</button>
                </li>
              ))}
            </ul>
          )}
          {extras.length < maxExtra ? (
            <button type="button" onClick={() => setPicking(true)} className="flex h-28 w-full flex-col items-center justify-center gap-2 rounded-xl bg-sand">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-ink text-2xl text-white">+</span>
              <span className="font-medium">Adicionar sabor</span>
            </button>
          ) : (
            <p className="text-sm text-ink/60">Máximo de sabores atingido para este tamanho.</p>
          )}
        </div>
      )}

      {primaryChosen && product.groups.filter((g) => g !== primary).map((g) => (
        <fieldset key={g.id} className="mb-5">
          <legend className="mb-2 flex w-full items-center justify-between font-bold">
            <span>{g.name}</span>
            <span className="chip bg-sand text-ink/70">
              {g.min_select > 0 ? 'Obrigatório' : 'Opcional'}
              {g.max_select > 1 ? ` · até ${g.max_select}` : ''}
            </span>
          </legend>
          <div className="grid gap-2">
            {g.options.map((o) => {
              const on = (sel[g.id] ?? []).includes(o.id);
              return (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => toggle(g.id, o.id, g.max_select)}
                  className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left ${
                    on ? 'border-brand bg-brand/10' : 'border-sand bg-white'
                  }`}
                >
                  <span className="font-medium">{o.name}</span>
                  <span className="text-sm text-ink/70">{o.price_delta > 0 ? `+ ${brl(o.price_delta)}` : ''}</span>
                </button>
              );
            })}
          </div>
        </fieldset>
      ))}

      {primaryChosen && (
        <>
          <label className="label" htmlFor="obs">Observação</label>
          <input id="obs" className="input mb-2" maxLength={200} placeholder="Ex.: sem cebola" value={notes} onChange={(e) => setNotes(e.target.value)} />
          {extras.length > 0 && <p className="mb-5 text-xs italic text-ink/60">*Será cobrado pelo sabor de maior valor.</p>}
        </>
      )}

      <div className="sticky bottom-0 -mx-4 flex items-center gap-3 border-t border-sand bg-white p-4">
        <div className="flex items-center gap-3 rounded-full border border-sand px-2">
          <button className="h-10 w-10 text-xl" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Menos">−</button>
          <span className="w-5 text-center font-bold">{qty}</span>
          <button className="h-10 w-10 text-xl" onClick={() => setQty((q) => Math.min(50, q + 1))} aria-label="Mais">+</button>
        </div>
        <button className="btn-primary flex-1" disabled={!!missing || unit <= 0 || !primaryChosen} onClick={add}>
          {!primaryChosen ? 'Selecione um tamanho' : missing ? `Escolha: ${missing.name}` : `Adicionar · ${brl(unit * qty)}`}
        </button>
      </div>
    </Sheet>
  );
}

/* ---------- Escolha de sabores (dentro da janela do pedido) ---------- */
function FlavorPicker({
  title, subtitle, candidates, initial, max, unitOf, sizeName, onCancel, onConfirm,
}: {
  sizeName?: string; title: string; subtitle: string; candidates: Product[]; initial: string[]; max: number;
  unitOf: (p: Product) => number | null; onCancel: () => void; onConfirm: (ids: string[]) => void;
}) {
  const [picked, setPicked] = useState<string[]>(initial);
  const [q, setQ] = useState('');
  const norm = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const list = candidates.filter((p) => !q.trim() || norm(`${p.name} ${p.description ?? ''}`).includes(norm(q)));

  function toggle(id: string) {
    setPicked((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : cur.length >= max ? cur : [...cur, id]));
  }

  return (
    <Sheet onClose={onCancel} title={title}>
      <p className="mb-3 text-sm text-ink/70">{subtitle}</p>
      <input className="input mb-3" type="search" placeholder="Buscar sabor…" value={q} onChange={(e) => setQ(e.target.value)} />
      <ul className="grid gap-2 pb-4">
        {list.map((p) => {
          const on = picked.includes(p.id);
          const price = unitOf(p);
          const noSize = price === null;
          const full = (!on && picked.length >= max) || noSize;
          return (
            <li key={p.id}>
              <button
                type="button"
                disabled={full}
                onClick={() => toggle(p.id)}
                className={`flex w-full items-center gap-3 rounded-xl border p-2 text-left ${on ? 'border-brand bg-brand/10' : 'border-sand bg-white'} ${full ? 'opacity-40' : ''}`}
              >
                {p.photo_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.photo_url} alt="" className="h-16 w-16 shrink-0 rounded-lg object-cover" />
                )}
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{p.name}</span>
                  {p.description && <span className="line-clamp-2 block text-xs text-ink/60">{p.description}</span>}
                  <span className="block text-sm text-ink/80">{noSize ? `Sem tamanho ${sizeName ?? ''}`.trim() : brl(price)}</span>
                </span>
                <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded border ${on ? 'border-brand bg-brand text-white' : 'border-ink/30'}`}>{on ? '✓' : ''}</span>
              </button>
            </li>
          );
        })}
        {list.length === 0 && <li className="py-6 text-center text-sm text-ink/60">Nenhum sabor encontrado.</li>}
      </ul>
      <div className="sticky bottom-0 -mx-4 flex items-center gap-3 border-t border-sand bg-white p-4">
        <button className="btn-ghost flex-1" onClick={onCancel}>CANCELAR</button>
        <button className="btn-primary flex-1" onClick={() => onConfirm(picked)}>CONFIRMAR{picked.length ? ` (${picked.length})` : ''}</button>
      </div>
    </Sheet>
  );
}

/* ---------- Taxa por endereço (CEP -> bairro -> região) ---------- */
const normTxt = (t: string) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
// O nome da região pode listar vários bairros separados por vírgula, barra ou " e " (ex.: "Pituba, Itaigara").
function matchZone(zones: Zone[], bairro: string): Zone | undefined {
  const b = normTxt(bairro);
  if (b.length < 3) return undefined;
  const parts = (z: Zone) => z.name.split(/[,;/|]| e /i).map(normTxt).filter(Boolean);
  return zones.find((z) => parts(z).some((x) => x === b)) ?? zones.find((z) => parts(z).some((x) => x.length >= 3 && (x.includes(b) || b.includes(x))));
}

/* ---------- Carrinho + finalizar ---------- */
function Checkout({
  business, zones, hours, coupons, cart, setCart, isOpen, onClose, onDone,
}: {
  business: Business;
  zones: Zone[];
  hours: Hours[];
  coupons: PublicCoupon[];
  cart: CartLine[];
  setCart: React.Dispatch<React.SetStateAction<CartLine[]>>;
  isOpen: boolean;
  onClose: () => void;
  onDone: (r: { code: string; total: number }) => void;
}) {
  const canDelivery = business.accepts_delivery;
  const canPickup = business.accepts_pickup;
  const [fulfillment, setFulfillment] = useState<'delivery' | 'pickup'>(canDelivery ? 'delivery' : 'pickup');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [zoneId, setZoneId] = useState('');
  const [street, setStreet] = useState('');
  const [number, setNumber] = useState('');
  const [complement, setComplement] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [reference, setReference] = useState('');
  const [cep, setCep] = useState('');
  const [cepMsg, setCepMsg] = useState('');
  const [notes, setNotes] = useState('');
  const [change, setChange] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [couponInput, setCouponInput] = useState('');
  const [coupon, setCoupon] = useState<{ code: string; discount: number } | null>(null);
  const [couponMsg, setCouponMsg] = useState('');
  const [scheduleOn, setScheduleOn] = useState(false);
  const [scheduleDay, setScheduleDay] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const canSchedule = !!business.accepts_scheduling;
  const minMin = business.schedule_min_minutes ?? 30;
  const maxDays = business.schedule_max_days ?? 7;
  const sDays = useMemo(() => (canSchedule ? scheduleDays(hours, minMin, maxDays) : []), [canSchedule, hours, minMin, maxDays]);
  const dayObj = sDays.find((d) => d.key === scheduleDay);
  const sTimes = dayObj ? daySlots(dayObj.date, hours, new Date(Date.now() + minMin * 60000)) : [];
  const scheduleAt = dayObj && scheduleTime ? `${scheduleDay}T${scheduleTime}` : '';

  useEffect(() => {
    try {
      const z = localStorage.getItem(`comanda-zona-${business.id}`);
      if (z && zones.some((x) => x.id === z)) setZoneId(z);
    } catch {}
  }, [business.id, zones]);

  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem('comanda-cliente') || '{}');
      if (s.name) setName(s.name);
      if (s.phone) setPhone(s.phone);
      if (s.street) setStreet(s.street);
      if (s.number) setNumber(s.number);
      if (s.neighborhood) setNeighborhood(s.neighborhood);
    } catch {}
  }, []);

  // bairro digitado ou vindo do CEP -> escolhe a região (e a taxa) automaticamente
  useEffect(() => {
    if (!neighborhood.trim() || zones.length === 0) return;
    const z = matchZone(zones, neighborhood);
    if (z) { setZoneId(z.id); setCepMsg(''); }
  }, [neighborhood, zones]);

  async function lookupCep(v: string) {
    const d = onlyDigits(v).slice(0, 8);
    setCep(d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d);
    if (d.length !== 8) { setCepMsg(''); return; }
    setCepMsg('Buscando endereço…');
    try {
      const res = await fetch(`https://viacep.com.br/ws/${d}/json/`);
      const j = await res.json();
      if (j.erro) { setCepMsg('CEP não encontrado. Preencha o endereço manualmente.'); return; }
      if (j.logradouro) setStreet(j.logradouro);
      if (j.bairro) setNeighborhood(j.bairro);
      const z = j.bairro ? matchZone(zones, j.bairro) : undefined;
      setCepMsg(z ? '' : zones.length > 0 ? `Não encontramos a taxa para ${j.bairro || 'esse bairro'}. Escolha a região abaixo.` : '');
    } catch {
      setCepMsg('Não foi possível buscar o CEP. Preencha manualmente.');
    }
  }

  const zone = zones.find((z) => z.id === zoneId);
  const subtotal = cart.reduce((s, l) => s + l.unit_price * l.quantity, 0);
  const fee = fulfillment === 'delivery' ? zone?.fee ?? 0 : 0;
  const discount = coupon ? coupon.discount : 0;
  const total = Math.max(0, subtotal + fee - discount);

  async function checkCoupon(code: string, silent = false) {
    if (!code.trim()) return;
    if (!silent) setCouponMsg('');
    try {
      const r = await fetch('/api/coupon', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ business_id: business.id, code, phone, subtotal, fee }),
      });
      const d = await r.json().catch(() => ({}));
      if (r.ok) { setCoupon({ code: code.trim().toUpperCase(), discount: Number(d.discount) }); setCouponMsg(''); }
      else { setCoupon(null); setCouponMsg(d.error || 'Cupom inválido.'); }
    } catch { setCouponMsg('Sem conexão. Tente novamente.'); }
  }
  useEffect(() => {
    // cupom escolhido na vitrine ("Usar") ja entra aplicado
    try {
      const saved = localStorage.getItem(`comanda-cupom-${business.id}`);
      if (saved) { setCouponInput(saved); checkCoupon(saved, true); }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // Se o carrinho/entrega mudar, confere o cupom de novo (o desconto pode mudar).
  useEffect(() => {
    if (coupon) checkCoupon(coupon.code, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subtotal, fee, fulfillment]);

  function setQty(key: string, delta: number) {
    setCart((prev) =>
      prev.map((l) => (l.key === key ? { ...l, quantity: l.quantity + delta } : l)).filter((l) => l.quantity > 0)
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!isOpen && !scheduleOn) return setError('A loja está fechada agora.');
    if (scheduleOn && !scheduleAt) return setError('Escolha o dia e o horário do agendamento.');
    if (cart.length === 0) return setError('Seu carrinho está vazio.');
    if (name.trim().length < 2) return setError('Informe seu nome.');
    const digits = onlyDigits(phone);
    if (digits.length < 10) return setError('Informe o WhatsApp com DDD.');
    if (fulfillment === 'delivery') {
      if (zones.length > 0 && !zoneId) return setError('Escolha a região de entrega.');
      if (street.trim().length < 3) return setError('Informe a rua do endereço.');
    }
    setBusy(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_id: business.id,
          name,
          phone,
          fulfillment,
          zone_id: fulfillment === 'delivery' && zoneId ? zoneId : null,
          address: { street, number, complement, neighborhood, reference },
          notes,
          change_for: change ? Number(change.replace(',', '.')) : null,
          coupon_code: coupon ? coupon.code : null,
          scheduled_for: scheduleOn && scheduleAt ? new Date(scheduleAt).toISOString() : null,
          items: cart.map((l) => ({ product_id: l.product_id, half_product_id: l.half_product_id ?? null, half_product_ids: l.half_product_ids ?? (l.half_product_id ? [l.half_product_id] : []), quantity: l.quantity, option_ids: l.option_ids, notes: l.notes })),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Não foi possível enviar o pedido.');
        setBusy(false);
        return;
      }
      try {
        localStorage.setItem('comanda-cliente', JSON.stringify({ name, phone, street, number, neighborhood }));
      } catch {}
      saveEntry(business.id, { code: String(data.code), phone });
      onDone({ code: data.code, total: data.total });
    } catch {
      setError('Sem conexão. Tente novamente.');
      setBusy(false);
    }
  }

  return (
    <Sheet onClose={onClose} title="Seu pedido">
      <ul className="mb-4 divide-y divide-sand">
        {cart.map((l) => (
          <li key={l.key} className="flex items-start justify-between gap-3 py-3">
            <div className="min-w-0">
              <p className="font-semibold">{l.name}</p>
              {l.option_labels.length > 0 && <p className="text-sm text-ink/60">{l.option_labels.join(', ')}</p>}
              {l.notes && <p className="text-sm italic text-ink/60">“{l.notes}”</p>}
              <p className="mt-1 text-sm font-bold text-brand-dark">{brl(l.unit_price * l.quantity)}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2 rounded-full border border-sand px-1">
              <button type="button" className="h-9 w-9 text-lg" onClick={() => setQty(l.key, -1)} aria-label="Menos">−</button>
              <span className="w-4 text-center font-bold">{l.quantity}</span>
              <button type="button" className="h-9 w-9 text-lg" onClick={() => setQty(l.key, 1)} aria-label="Mais">+</button>
            </div>
          </li>
        ))}
      </ul>

      <form onSubmit={submit} className="grid gap-4">
        {canDelivery && canPickup && (
          <div className="grid grid-cols-2 gap-2">
            {(['delivery', 'pickup'] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFulfillment(f)}
                className={`rounded-xl border px-3 py-3 font-semibold ${
                  fulfillment === f ? 'border-brand bg-brand/10' : 'border-sand bg-white'
                }`}
              >
                {f === 'delivery' ? '🛵 Entrega' : '🏪 Retirada'}
              </button>
            ))}
          </div>
        )}

        <div>
          <label className="label" htmlFor="nome">Seu nome</label>
          <input id="nome" className="input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" maxLength={80} />
        </div>
        <div>
          <label className="label" htmlFor="tel">WhatsApp (com DDD)</label>
          <input id="tel" className="input" inputMode="tel" placeholder="(71) 99999-9999" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" />
        </div>

        {fulfillment === 'delivery' && (
          <>
            <div>
              <label className="label" htmlFor="cep">CEP</label>
              <input id="cep" className="input" inputMode="numeric" placeholder="00000-000" value={cep} onChange={(e) => lookupCep(e.target.value)} autoComplete="postal-code" />
              {cepMsg && <p className="mt-1 text-sm text-ink/70">{cepMsg}</p>}
            </div>
            {zones.length > 0 && (
              <div>
                <label className="label" htmlFor="zona">Região de entrega</label>
                <select id="zona" className="input" value={zoneId} onChange={(e) => setZoneId(e.target.value)}>
                  <option value="">Escolha…</option>
                  {zones.map((z) => (
                    <option key={z.id} value={z.id}>
                      {z.name} — {z.fee > 0 ? brl(z.fee) : 'Grátis'}
                      {z.eta_min ? ` · ~${z.eta_min} min` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="label" htmlFor="rua">Rua</label>
                <input id="rua" className="input" value={street} onChange={(e) => setStreet(e.target.value)} autoComplete="address-line1" />
              </div>
              <div>
                <label className="label" htmlFor="num">Nº</label>
                <input id="num" className="input" value={number} onChange={(e) => setNumber(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label" htmlFor="bairro">Bairro</label>
                <input id="bairro" className="input" value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} />
              </div>
              <div>
                <label className="label" htmlFor="comp">Complemento</label>
                <input id="comp" className="input" value={complement} onChange={(e) => setComplement(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="label" htmlFor="ref">Ponto de referência</label>
              <input id="ref" className="input" value={reference} onChange={(e) => setReference(e.target.value)} />
            </div>
          </>
        )}

        <div>
          <label className="label" htmlFor="troco">Pagamento na {fulfillment === 'delivery' ? 'entrega' : 'retirada'} — troco para quanto? (opcional)</label>
          <input id="troco" className="input" inputMode="decimal" placeholder="Ex.: 100" value={change} onChange={(e) => setChange(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="obs2">Observações do pedido</label>
          <input id="obs2" className="input" maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        {canSchedule && (
          <div className="rounded-2xl border border-sand p-3">
            <label className="flex items-center gap-3 font-bold">
              <input type="checkbox" className="h-5 w-5 accent-brand" checked={scheduleOn} onChange={(e) => setScheduleOn(e.target.checked)} />
              🕒 Agendar para mais tarde
            </label>
            {scheduleOn && (
              sDays.length === 0 ? (
                <p className="mt-2 text-sm text-red-700">Não há horários disponíveis para agendar agora.</p>
              ) : (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div>
                    <label className="label" htmlFor="sdia">Dia</label>
                    <select id="sdia" className="input" value={scheduleDay} onChange={(e) => { setScheduleDay(e.target.value); setScheduleTime(''); }}>
                      <option value="">Escolha…</option>
                      {sDays.map((d) => <option key={d.key} value={d.key}>{d.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label" htmlFor="shora">Horário</label>
                    <select id="shora" className="input" value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)} disabled={!dayObj}>
                      <option value="">Escolha…</option>
                      {sTimes.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <p className="col-span-2 text-xs text-ink/60">Só aparecem horários em que a loja funciona. A loja confirma ao aceitar o pedido.</p>
                </div>
              )
            )}
          </div>
        )}

        <div>
          <label className="label" htmlFor="cupom">Cupom de desconto</label>
          <div className="flex gap-2">
            <input id="cupom" className="input uppercase" value={couponInput} onChange={(e) => setCouponInput(e.target.value)} placeholder="Digite o cupom" maxLength={20} disabled={!!coupon} />
            {coupon ? (
              <button type="button" className="btn-ghost btn-sm shrink-0" onClick={() => { setCoupon(null); setCouponInput(''); }}>Remover</button>
            ) : (
              <button type="button" className="btn-ghost btn-sm shrink-0" disabled={!couponInput.trim()} onClick={() => checkCoupon(couponInput)}>Aplicar</button>
            )}
          </div>
          {!coupon && coupons.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {coupons.map((c) => (
                <button key={c.code} type="button" onClick={() => { setCouponInput(c.code); checkCoupon(c.code); }} className="rounded-full border border-dashed border-brand px-3 py-1 text-xs font-bold">
                  🎟 {c.code} · {couponTitle(c)}
                </button>
              ))}
            </div>
          )}
          {coupon && <p className="mt-1 text-sm font-semibold text-green-700">Cupom {coupon.code} aplicado: − {brl(coupon.discount)}</p>}
          {couponMsg && <p className="mt-1 text-sm text-red-700">{couponMsg}</p>}
        </div>

        <dl className="space-y-1 rounded-xl bg-sand/60 p-4 text-sm">
          <div className="flex justify-between"><dt>Itens</dt><dd>{brl(subtotal)}</dd></div>
          {fulfillment === 'delivery' && <div className="flex justify-between"><dt>Entrega</dt><dd>{zone ? (fee > 0 ? brl(fee) : 'Grátis') : 'Escolha a região'}</dd></div>}
          {discount > 0 && <div className="flex justify-between text-green-700"><dt>Desconto</dt><dd>− {brl(discount)}</dd></div>}
          <div className="flex justify-between text-base font-extrabold"><dt>Total</dt><dd>{brl(total)}</dd></div>
        </dl>

        {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}

        <button className="btn-primary" disabled={busy || (!isOpen && !scheduleOn)}>
          {busy ? 'Enviando…' : `Enviar pedido · ${brl(total)}`}
        </button>
        <p className="text-center text-xs text-ink/50">O valor final é conferido pela loja ao receber o pedido.</p>
      </form>
    </Sheet>
  );
}

function Success({ business, code, total, onTrack }: { business: Business; code: string; total: number; onTrack: () => void }) {
  const wa = business.whatsapp_contact
    ? `https://wa.me/${business.whatsapp_contact}?text=${encodeURIComponent(`Olá! Fiz o pedido ${code} pelo cardápio online.`)}`
    : null;
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-5 px-6 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-sun text-4xl">✅</div>
      <h1 className="text-3xl font-extrabold">Pedido enviado!</h1>
      <p className="text-ink/70">
        {business.name} recebeu seu pedido e vai confirmar em instantes. Guarde o código:
      </p>
      <p className="rounded-2xl bg-white px-8 py-4 font-display text-4xl font-extrabold tracking-widest shadow-card">{code}</p>
      <p className="text-ink/70">Total: <strong>{brl(total)}</strong></p>
      {wa && (
        <a href={wa} className="btn-primary w-full" target="_blank" rel="noreferrer">
          Falar com a loja no WhatsApp
        </a>
      )}
      <button className="btn-primary w-full" onClick={onTrack}>Acompanhar meu pedido</button>
      <button className="btn-ghost w-full" onClick={() => location.reload()}>Fazer outro pedido</button>
    </main>
  );
}

function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);
  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-ink/50 sm:items-center" onClick={onClose}>
      <div
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white px-4 pt-4 sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={title}
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-xl font-extrabold">{title}</h2>
          <button onClick={onClose} className="h-10 w-10 rounded-full bg-sand text-lg" aria-label="Fechar">✕</button>
        </div>
        <div className="pb-6">{children}</div>
      </div>
    </div>
  );
}
