'use client';

import { useEffect, useRef, useState } from 'react';
import { brl } from '@/lib/format';

export type PixInfo = { code: string | null; qr: string | null; expires_at: string | null };

// Mostra o Pix do pedido (QR + copia e cola), confere o pagamento a cada poucos segundos e avisa quando confirmar.
export default function PixPayment({
  businessId, code, phone, total, initial, onPaid, onExpired,
}: {
  businessId: string; code: string; phone: string; total: number; initial?: PixInfo | null;
  onPaid?: () => void; onExpired?: () => void;
}) {
  const [pix, setPix] = useState<PixInfo | null>(initial ?? null);
  const [state, setState] = useState<'waiting' | 'paid' | 'expired'>('waiting');
  const [left, setLeft] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const doneRef = useRef(false);

  async function check() {
    try {
      const r = await fetch('/api/orders/pix', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ business_id: businessId, code, phone }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) return;
      if (d.paid) { if (!doneRef.current) { doneRef.current = true; setState('paid'); onPaid?.(); } return; }
      if (d.status === 'cancelled') { if (!doneRef.current) { doneRef.current = true; setState('expired'); onExpired?.(); } return; }
      if (d.pix) setPix(d.pix);
    } catch {}
  }

  useEffect(() => {
    check();
    const t = setInterval(() => { if (!doneRef.current) check(); }, 4000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId, code, phone]);

  useEffect(() => {
    if (!pix?.expires_at) return;
    const end = Date.parse(pix.expires_at);
    const tick = () => setLeft(Math.max(0, Math.floor((end - Date.now()) / 1000)));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [pix?.expires_at]);

  async function copy() {
    if (!pix?.code) return;
    try { await navigator.clipboard.writeText(pix.code); setCopied(true); setTimeout(() => setCopied(false), 2500); } catch {}
  }

  if (state === 'paid') {
    return (
      <div className="rounded-2xl bg-green-50 p-4 text-center">
        <p className="text-3xl">✅</p>
        <p className="mt-1 text-lg font-extrabold text-green-800">Pagamento confirmado!</p>
        <p className="text-sm text-green-900/80">A loja já recebeu seu pedido.</p>
      </div>
    );
  }
  if (state === 'expired') {
    return (
      <div className="rounded-2xl bg-red-50 p-4 text-center">
        <p className="font-bold text-red-800">O Pix expirou e o pedido foi cancelado.</p>
        <p className="text-sm text-red-900/80">Faça um novo pedido para gerar outro Pix.</p>
      </div>
    );
  }
  const mm = left === null ? '' : `${String(Math.floor(left / 60)).padStart(2, '0')}:${String(left % 60).padStart(2, '0')}`;
  return (
    <div className="rounded-2xl border border-sand p-4 text-center">
      <p className="font-extrabold">Pague com Pix · {brl(total)}</p>
      {pix?.qr ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={`data:image/png;base64,${pix.qr}`} alt="QR Code Pix" className="mx-auto my-3 h-48 w-48 rounded-xl bg-white p-2" />
      ) : (
        <p className="my-3 text-sm text-ink/60">Carregando o Pix…</p>
      )}
      {pix?.code && (
        <>
          <p className="break-all rounded-xl bg-sand p-2 text-xs text-ink/70">{pix.code}</p>
          <button type="button" className="btn-primary mt-3 w-full" onClick={copy}>{copied ? 'Código copiado!' : 'Copiar código Pix'}</button>
        </>
      )}
      <p className="mt-3 text-sm text-ink/70">Abra o app do seu banco, escolha <b>Pix copia e cola</b> (ou leia o QR) e pague. Esta tela confirma sozinha.</p>
      {mm && <p className="mt-1 text-xs text-ink/50">Expira em {mm}</p>}
    </div>
  );
}
