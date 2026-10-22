'use client';

import { useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { uploadImage } from '@/lib/upload';
import { bestMatch } from '@/lib/matchPhotos';
import PhotoNames from '@/components/painel/PhotoNames';

type P = { id: string; name: string; photo_url: string | null };
type Row = { file: File; productId: string; url: string };

export default function PhotoImport({ businessId, products, onClose, onDone }: { businessId: string; products: P[]; onClose: () => void; onDone: () => void }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [overwrite, setOverwrite] = useState(false);

  function pick(files: FileList | null) {
    if (!files || files.length === 0) return;
    setMsg(''); setErr('');
    const imgs = Array.from(files).filter((f) => f.type.startsWith('image/')).slice(0, 200);
    setRows(imgs.map((file) => ({ file, productId: bestMatch(file.name, products) ?? '', url: URL.createObjectURL(file) })));
  }

  const used = new Set<string>();
  const dupes = new Set<string>();
  rows.forEach((r) => { if (r.productId) { if (used.has(r.productId)) dupes.add(r.productId); used.add(r.productId); } });
  const ready = rows.filter((r) => r.productId);

  async function run() {
    setBusy(true); setErr(''); setMsg(''); setProgress(0);
    const s = supabaseBrowser();
    // se duas fotos apontam para o mesmo produto, vale a ultima
    const byProduct = new Map<string, Row>();
    ready.forEach((r) => byProduct.set(r.productId, r));
    const jobs = Array.from(byProduct.values()).filter((r) => overwrite || !products.find((p) => p.id === r.productId)?.photo_url);
    let ok = 0, fail = 0, i = 0;
    async function worker() {
      while (i < jobs.length) {
        const j = jobs[i++];
        try {
          const url = await uploadImage(businessId, j.file, 900);
          const r = await s.from('products').update({ photo_url: url }).eq('id', j.productId);
          if (r.error) throw r.error;
          ok++;
        } catch { fail++; }
        setProgress(ok + fail);
      }
    }
    await Promise.all([worker(), worker(), worker()]);
    setBusy(false);
    const skipped = byProduct.size - jobs.length;
    setMsg(`${ok} foto(s) aplicada(s)${skipped ? `, ${skipped} produto(s) já tinham foto e foram mantidos` : ''}${fail ? `, ${fail} falharam (tente de novo)` : ''}.`);
    if (ok) { setRows([]); onDone(); }
  }

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-ink/50 sm:items-center" onClick={onClose}>
      <div className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-t-3xl bg-white px-4 pt-4 sm:rounded-3xl" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Importar fotos">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-xl font-extrabold">Importar fotos</h2>
          <button onClick={onClose} className="h-10 w-10 rounded-full bg-sand text-lg" aria-label="Fechar">✕</button>
        </div>
        <div className="grid gap-4 pb-6">
          <p className="text-sm text-ink/70">
            Escolha várias fotos de uma vez. Nomeie cada arquivo com o nome do produto (ex.: <b>pizza-calabresa.jpg</b>) e a gente liga cada foto ao produto certo. O que não for reconhecido você escolhe na lista.
          </p>
          <details className="rounded-xl border border-sand p-3">
            <summary className="cursor-pointer font-semibold">Ver modelo de nomes dos arquivos</summary>
            <div className="mt-3"><PhotoNames businessId={businessId} products={products} /></div>
          </details>
          <label className="btn-primary cursor-pointer text-center">
            {rows.length ? 'Escolher outras fotos' : 'Escolher fotos'}
            <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => { pick(e.target.files); e.target.value = ''; }} />
          </label>

          {rows.length > 0 && (
            <>
              <p className="text-sm"><b>{ready.length}</b> de {rows.length} foto(s) ligadas a um produto.</p>
              <ul className="grid max-h-80 gap-2 overflow-y-auto">
                {rows.map((r, idx) => (
                  <li key={idx} className="flex items-center gap-3 rounded-xl border border-sand p-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={r.url} alt="" className="h-14 w-14 shrink-0 rounded-lg object-cover" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs text-ink/60">{r.file.name}</p>
                      <select
                        className="input mt-1 py-2 text-sm"
                        value={r.productId}
                        onChange={(e) => setRows((p) => p.map((x, i) => (i === idx ? { ...x, productId: e.target.value } : x)))}
                      >
                        <option value="">— sem produto (ignorar) —</option>
                        {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                      {r.productId && dupes.has(r.productId) && <p className="mt-1 text-xs text-red-700">Mais de uma foto para este produto: vale a última da lista.</p>}
                    </div>
                  </li>
                ))}
              </ul>
              <label className="flex items-center gap-3 text-sm font-medium">
                <input type="checkbox" className="h-5 w-5 accent-brand" checked={overwrite} onChange={(e) => setOverwrite(e.target.checked)} />
                Trocar também a foto de produtos que já têm foto
              </label>
              <button className="btn-primary" disabled={busy || ready.length === 0} onClick={run}>
                {busy ? `Enviando… ${progress}/${new Set(ready.map((r) => r.productId)).size}` : `Aplicar ${new Set(ready.map((r) => r.productId)).size} foto(s)`}
              </button>
            </>
          )}
          {err && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{err}</p>}
          {msg && <p className="rounded-xl bg-green-50 p-3 text-sm text-green-800">{msg}</p>}
        </div>
      </div>
    </div>
  );
}
