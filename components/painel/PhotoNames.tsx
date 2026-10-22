'use client';

import { useEffect, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { slugify } from '@/lib/format';

type P = { id: string; name: string };

// Modelo de nomes de arquivo para a importação de fotos: um por produto do cardápio do lojista.
export default function PhotoNames({ businessId, products }: { businessId: string; products?: P[] }) {
  const [list, setList] = useState<P[]>(products ?? []);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (products) { setList(products); return; }
    supabaseBrowser().from('products').select('id,name').eq('business_id', businessId).order('sort_order').order('name')
      .then(({ data }) => setList((data ?? []) as P[]));
  }, [businessId, products]);

  const lines = list.map((p) => `${slugify(p.name)}.jpg`);
  const text = list.map((p, i) => `${p.name}  →  ${lines[i]}`).join('\n');

  async function copy() {
    try { await navigator.clipboard.writeText(text); setMsg('Lista copiada!'); } catch { setMsg('Não foi possível copiar. Use “Baixar lista”.'); }
  }
  function download() {
    const blob = new Blob([`Nomes dos arquivos de foto\nProduto  →  nome do arquivo\n\n${text}\n`], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'nomes-das-fotos.txt';
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div className="rounded-xl bg-sand p-3 text-sm">
      <p className="text-ink/70">
        Salve cada foto com o nome do produto (acentos, maiúsculas e hífens não importam). Assim a importação liga cada foto ao produto certo sozinha. Exemplo: <b>pizza-calabresa.jpg</b>.
      </p>
      {list.length === 0 ? (
        <p className="mt-2 text-ink/60">Cadastre produtos no Cardápio para ver a lista.</p>
      ) : (
        <>
          <div className="mt-2 flex gap-2">
            <button type="button" className="btn-ghost btn-sm" onClick={copy}>Copiar lista</button>
            <button type="button" className="btn-ghost btn-sm" onClick={download}>Baixar lista (.txt)</button>
          </div>
          {msg && <p className="mt-1 text-green-800">{msg}</p>}
          <ul className="mt-2 max-h-64 divide-y divide-white overflow-y-auto rounded-lg bg-white px-3">
            {list.map((p, i) => (
              <li key={p.id} className="flex items-center justify-between gap-3 py-1.5">
                <span className="font-medium">{p.name}</span>
                <code className="shrink-0 text-xs text-ink/60">{lines[i]}</code>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
