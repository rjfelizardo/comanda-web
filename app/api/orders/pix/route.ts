import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { normalizePhone } from '@/lib/format';
import { settlePayment } from '@/lib/mercadopago';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const hits = new Map<string, number[]>();
function limited(ip: string) {
  const now = Date.now();
  const arr = (hits.get(ip) ?? []).filter((t) => now - t < 10 * 60 * 1000);
  arr.push(now);
  hits.set(ip, arr);
  if (hits.size > 5000) hits.clear();
  return arr.length > 300;
}

// Situacao do Pix de um pedido (codigo + telefone). Tambem confere no Mercado Pago, caso o aviso demore.
export async function POST(req: Request) {
  const ip = (req.headers.get('x-forwarded-for') ?? 'unknown').split(',')[0].trim();
  if (limited(ip)) return NextResponse.json({ error: 'Muitas consultas.' }, { status: 429 });
  let b: any;
  try { b = await req.json(); } catch { return NextResponse.json({ error: 'Requisição inválida.' }, { status: 400 }); }
  const businessId = typeof b?.business_id === 'string' ? b.business_id.slice(0, 60) : '';
  const code = typeof b?.code === 'string' ? b.code.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12) : '';
  const phone = normalizePhone(typeof b?.phone === 'string' ? b.phone.slice(0, 30) : '');
  if (!businessId || !code || phone.length < 10) return NextResponse.json({ error: 'Pedido não encontrado.' }, { status: 404 });

  const db = supabaseAdmin();
  const get = () =>
    db.from('orders').select('id,status,payment_status,payment_method,mp_payment_id,pix_code,pix_qr,pix_expires_at,total')
      .eq('business_id', businessId).eq('customer_phone', phone).eq('code', code).maybeSingle();
  let { data: o } = await get();
  if (!o || o.payment_method !== 'online') return NextResponse.json({ error: 'Pedido não encontrado.' }, { status: 404 });

  if (o.status === 'awaiting_payment' && o.mp_payment_id) {
    await settlePayment(db, businessId, String(o.mp_payment_id)).catch(() => 'ignored');
    ({ data: o } = await get());
  }
  if (o && o.status === 'awaiting_payment' && o.pix_expires_at && Date.parse(o.pix_expires_at) < Date.now()) {
    await db.rpc('set_order_status', { p_order_id: o.id, p_status: 'cancelled' });
    ({ data: o } = await get());
  }
  const waiting = o!.status === 'awaiting_payment';
  return NextResponse.json({
    status: o!.status,
    paid: o!.payment_status === 'paid',
    total: Number(o!.total),
    pix: waiting ? { code: o!.pix_code, qr: o!.pix_qr, expires_at: o!.pix_expires_at } : null,
  });
}
