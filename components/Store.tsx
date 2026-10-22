'use client';

import { useEffect, useMemo, useState } from 'react';
import { brl, onlyDigits } from '@/lib/format';
import MyOrders, { saveEntry } from '@/components/MyOrders';
import type { Business, CartLine, Category, Product, Zone } from '@/lib/types';

type Props = {
  business: Business;
  categories: Category[];
  products: Product[];
  zones: Zone[];
  isOpen: boolean;
};

export default function Store({ business, categories, products, zones, isOpen }: Props) {
  const storageKey = `comanda-cart-${business.id}`;
  const [cart, setCart] = useState<CartLine[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [picked, setPicked] = useState<Product | null>(null);
  const [checkout, setCheckout] = useState(false);
  const [done, setDone] = useState<{ code: string; total: number } | null>(null);
  const [activeCat, setActiveCat] = useState<string>('');
  const [ordersOpen, setOrdersOpen] = useState(false);

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
    <div className="mx-auto min-h-screen max-w-2xl pb-28">
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
        <button onClick={() => setOrdersOpen(true)} className="btn-ghost btn-sm mt-3 w-full">🧾 Meus pedidos</button>
        {business.description && <p className="mt-3 text-sm text-ink/70">{business.description}</p>}
        {!isOpen && (
          <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-800">
            A loja está fechada agora. Você pode olhar o cardápio, mas não é possível enviar pedidos.
          </p>
        )}
      </header>

      {/* Categorias */}
      {sections.length > 1 && (
        <nav className="sticky top-0 z-10 mt-4 flex gap-2 overflow-x-auto bg-cream/95 px-4 py-3 backdrop-blur">
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

      {/* Cardápio */}
      <main className="mt-2 px-4">
        {sections.length === 0 && (
          <p className="py-16 text-center text-ink/60">O cardápio ainda está sendo preparado. Volte em breve.</p>
        )}
        {sections.map((s) => (
          <section key={s.id} id={`cat-${s.id}`} className="scroll-mt-16 pt-4">
            <h2 className="mb-3 text-lg font-extrabold">{s.name}</h2>
            <div className="grid gap-3">
              {s.items.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPicked(p)}
                  className="card flex items-stretch gap-3 p-3 text-left transition active:scale-[.99]"
                >
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold leading-tight">{p.name}</h3>
                    {p.description && <p className="mt-1 line-clamp-2 text-sm text-ink/60">{p.description}</p>}
                    <p className="mt-2 font-bold text-brand-dark">
                      {p.groups.length > 0 && p.base_price > 0 ? 'a partir de ' : ''}
                      {p.base_price > 0 ? brl(p.base_price) : minFromOptions(p)}
                    </p>
                  </div>
                  {p.photo_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.photo_url} alt="" className="h-24 w-24 shrink-0 rounded-xl object-cover" />
                  )}
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
          onClose={() => setPicked(null)}
          onAdd={(l) => {
            addLine(l);
            setPicked(null);
          }}
        />
      )}

      {ordersOpen && <MyOrders businessId={business.id} whatsapp={business.whatsapp_contact} onClose={() => setOrdersOpen(false)} />}

      {checkout && (
        <Checkout
          business={business}
          zones={zones}
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
function ProductSheet({ product, onClose, onAdd }: { product: Product; onClose: () => void; onAdd: (l: CartLine) => void }) {
  const [sel, setSel] = useState<Record<string, string[]>>({});
  const [qty, setQty] = useState(1);
  const [notes, setNotes] = useState('');

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
  const unit = product.base_price + chosen.reduce((s, o) => s + o.price_delta, 0);
  const missing = product.groups.find((g) => (sel[g.id]?.length ?? 0) < g.min_select);

  function add() {
    if (missing) return;
    const ids = chosen.map((o) => o.id).sort();
    onAdd({
      key: `${product.id}|${ids.join(',')}|${notes.trim()}`,
      product_id: product.id,
      name: product.name,
      unit_price: unit,
      quantity: qty,
      option_ids: ids,
      option_labels: chosen.map((o) => o.name),
      notes: notes.trim(),
    });
  }

  return (
    <Sheet onClose={onClose} title={product.name}>
      {product.photo_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={product.photo_url} alt="" className="mb-3 h-44 w-full rounded-2xl object-cover" />
      )}
      {product.description && <p className="mb-4 text-sm text-ink/70">{product.description}</p>}

      {product.groups.map((g) => (
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

      <label className="label" htmlFor="obs">Observação</label>
      <input id="obs" className="input mb-5" maxLength={200} placeholder="Ex.: sem cebola" value={notes} onChange={(e) => setNotes(e.target.value)} />

      <div className="sticky bottom-0 -mx-4 flex items-center gap-3 border-t border-sand bg-white p-4">
        <div className="flex items-center gap-3 rounded-full border border-sand px-2">
          <button className="h-10 w-10 text-xl" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Menos">−</button>
          <span className="w-5 text-center font-bold">{qty}</span>
          <button className="h-10 w-10 text-xl" onClick={() => setQty((q) => Math.min(50, q + 1))} aria-label="Mais">+</button>
        </div>
        <button className="btn-primary flex-1" disabled={!!missing || unit <= 0} onClick={add}>
          {missing ? `Escolha: ${missing.name}` : `Adicionar · ${brl(unit * qty)}`}
        </button>
      </div>
    </Sheet>
  );
}

/* ---------- Carrinho + finalizar ---------- */
function Checkout({
  business, zones, cart, setCart, isOpen, onClose, onDone,
}: {
  business: Business;
  zones: Zone[];
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
  const [notes, setNotes] = useState('');
  const [change, setChange] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

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

  const zone = zones.find((z) => z.id === zoneId);
  const subtotal = cart.reduce((s, l) => s + l.unit_price * l.quantity, 0);
  const fee = fulfillment === 'delivery' ? zone?.fee ?? 0 : 0;
  const total = subtotal + fee;

  function setQty(key: string, delta: number) {
    setCart((prev) =>
      prev.map((l) => (l.key === key ? { ...l, quantity: l.quantity + delta } : l)).filter((l) => l.quantity > 0)
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!isOpen) return setError('A loja está fechada agora.');
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
          items: cart.map((l) => ({ product_id: l.product_id, quantity: l.quantity, option_ids: l.option_ids, notes: l.notes })),
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

        <dl className="space-y-1 rounded-xl bg-sand/60 p-4 text-sm">
          <div className="flex justify-between"><dt>Itens</dt><dd>{brl(subtotal)}</dd></div>
          {fulfillment === 'delivery' && <div className="flex justify-between"><dt>Entrega</dt><dd>{zone ? (fee > 0 ? brl(fee) : 'Grátis') : 'Escolha a região'}</dd></div>}
          <div className="flex justify-between text-base font-extrabold"><dt>Total</dt><dd>{brl(total)}</dd></div>
        </dl>

        {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}

        <button className="btn-primary" disabled={busy || !isOpen}>
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
