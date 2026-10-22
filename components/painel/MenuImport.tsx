'use client';

import { useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { parseMenuCsv, TEMPLATE_CSV, type ImpResult } from '@/lib/importMenu';
import { brl } from '@/lib/format';

export default function MenuImport({ businessId, onClose, onDone }: { businessId: string; onClose: () => void; onDone: () => void }) {
  const [res, setRes] = useState<ImpResult | null>(null);
  const [fileName, setFileName] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  async function pick(f?: File) {
    if (!f) return;
    setErr(''); setMsg('');
    if (f.size > 2_000_000) return setErr('Arquivo grande demais (máx. 2 MB).');
    setFileName(f.name);
    let text = await f.text();
    if (text.includes('�')) text = new TextDecoder('windows-1252').decode(await f.arrayBuffer());
    setRes(parseMenuCsv(text));
  }

  function template() {
    const url = URL.createObjectURL(new Blob([TEMPLATE_CSV], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url; a.download = 'modelo-cardapio-comanda.csv'; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  async function run() {
    if (!res || res.products.length === 0) return;
    setBusy(true); setErr(''); setMsg('');
    const s = supabaseBrowser();
    const createdProducts: string[] = [];
    try {
      const [ec, ep] = await Promise.all([
        s.from('categories').select('id,name,sort_order').eq('business_id', businessId),
        s.from('products').select('name,category_id').eq('business_id', businessId),
      ]);
      if (ec.error || ep.error) throw new Error('load');
      const lower = (x: string) => x.trim().toLowerCase();
      const catId = new Map<string, string>();
      let order = 0;
      ((ec.data ?? []) as any[]).forEach((c) => { catId.set(lower(c.name), c.id); order = Math.max(order, c.sort_order + 1); });
      const newCats: any[] = [];
      for (const p of res.products) {
        if (!catId.has(lower(p.category))) {
          const id = crypto.randomUUID();
          catId.set(lower(p.category), id);
          newCats.push({ id, business_id: businessId, name: p.category, sort_order: order++ });
        }
      }
      if (newCats.length) {
        const r = await s.from('categories').insert(newCats);
        if (r.error) throw new Error('cats');
      }
      const existing = new Set(((ep.data ?? []) as any[]).map((p) => `${p.category_id}|${lower(p.name)}`));
      const prods: any[] = [], groups: any[] = [], options: any[] = [];
      let skipped = 0, sort = 0;
      for (const p of res.products) {
        const cid = catId.get(lower(p.category))!;
        if (existing.has(`${cid}|${lower(p.name)}`)) { skipped++; continue; }
        const pid = crypto.randomUUID();
        prods.push({ id: pid, business_id: businessId, category_id: cid, name: p.name, description: p.description || null, base_price: p.price, sort_order: sort++ });
        p.groups.forEach((g, gi) => {
          const gid = crypto.randomUUID();
          groups.push({ id: gid, business_id: businessId, product_id: pid, name: g.name, min_select: g.min, max_select: g.max, sort_order: gi });
          g.options.forEach((o, oi) => options.push({ business_id: businessId, group_id: gid, name: o.name, price_delta: o.price, sort_order: oi }));
        });
      }
      const chunk = async (table: string, rows: any[], track?: boolean) => {
        for (let i = 0; i < rows.length; i += 100) {
          const part = rows.slice(i, i + 100);
          const r = await s.from(table).insert(part);
          if (r.error) throw new Error(table);
          if (track) part.forEach((x) => createdProducts.push(x.id));
        }
      };
      await chunk('products', prods, true);
      await chunk('product_option_groups', groups);
      await chunk('product_options', options);
      setMsg(`Pronto! ${prods.length} produto(s) importado(s)${skipped ? `, ${skipped} já existiam e foram ignorados` : ''}.`);
      setRes(null);
      onDone();
    } catch {
      if (createdProducts.length) await s.from('products').delete().in('id', createdProducts);
      setErr('Não foi possível importar. Nada foi adicionado aos produtos. Confira a planilha e tente de novo.');
    }
    setBusy(false);
  }

  const cats = res ? Array.from(new Set(res.products.map((p) => p.category))) : [];
  const nOpts = res ? res.products.reduce((n, p) => n + p.groups.reduce((m, g) => m + g.options.length, 0), 0) : 0;

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-ink/50 sm:items-center" onClick={onClose}>
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white px-4 pt-4 sm:rounded-3xl" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Importar cardápio">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-xl font-extrabold">Importar cardápio</h2>
          <button onClick={onClose} className="h-10 w-10 rounded-full bg-sand text-lg" aria-label="Fechar">✕</button>
        </div>
        <div className="grid gap-4 pb-6">
          <p className="text-sm text-ink/70">
            Suba a planilha (.csv) com todos os produtos de uma vez. No Excel ou Google Planilhas: Arquivo → Salvar/Baixar como <b>CSV</b>. As fotos você adiciona depois, produto por produto.
          </p>
          <button className="btn-ghost btn-sm justify-self-start" onClick={template}>⬇ Baixar planilha modelo</button>
          <label className="btn-primary cursor-pointer text-center">
            {fileName ? 'Escolher outro arquivo' : 'Escolher arquivo CSV'}
            <input type="file" accept=".csv,text/csv,text/plain" className="hidden" onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ''; }} />
          </label>

          {res && (
            <div className="rounded-2xl border border-sand p-3 text-sm">
              <p className="font-bold">{fileName}</p>
              <p className="mt-1">{res.products.length} produto(s) · {cats.length} categoria(s) · {nOpts} opção(ões)</p>
              <ul className="mt-2 max-h-40 overflow-y-auto text-ink/70">
                {res.products.slice(0, 12).map((p, i) => (
                  <li key={i}>{p.name} <span className="text-ink/50">— {p.price > 0 ? brl(p.price) : 'preço nas opções'}</span></li>
                ))}
                {res.products.length > 12 && <li>… e mais {res.products.length - 12}</li>}
              </ul>
              {res.errors.length > 0 && (
                <div className="mt-3 rounded-xl bg-red-50 p-2 text-red-800">
                  <p className="font-semibold">{res.errors.length} aviso(s). Estas linhas não serão importadas:</p>
                  <ul className="mt-1 max-h-32 list-disc overflow-y-auto pl-5">{res.errors.slice(0, 20).map((e, i) => <li key={i}>{e}</li>)}</ul>
                </div>
              )}
              <p className="mt-2 text-xs text-ink/60">Produtos que já existem na mesma categoria, com o mesmo nome, são ignorados.</p>
              <button className="btn-primary mt-3 w-full" disabled={busy || res.products.length === 0} onClick={run}>
                {busy ? 'Importando…' : `Importar ${res.products.length} produto(s)`}
              </button>
            </div>
          )}
          {err && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{err}</p>}
          {msg && <p className="rounded-xl bg-green-50 p-3 text-sm text-green-800">{msg}</p>}
        </div>
      </div>
    </div>
  );
}
