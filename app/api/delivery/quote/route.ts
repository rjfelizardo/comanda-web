import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { quoteDelivery, QUOTE_MESSAGES } from '@/lib/deliveryQuote';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const hits = new Map<string, number[]>();
function limited(ip: string) {
  const now = Date.now();
  const arr = (hits.get(ip) ?? []).filter((t) => now - t < 10 * 60 * 1000);
  arr.push(now);
  hits.set(ip, arr);
  if (hits.size > 5000) hits.clear();
  return arr.length > 30;
}


export async function POST(req: Request) {
  const ip = (req.headers.get('x-forwarded-for') ?? 'unknown').split(',')[0].trim();
  if (limited(ip)) return NextResponse.json({ error: 'Muitas consultas. Tente de novo em alguns minutos.' }, { status: 429 });
  let b: any;
  try { b = await req.json(); } catch { return NextResponse.json({ error: 'Requisição inválida.' }, { status: 400 }); }
  const s = (v: unknown, n: number) => (typeof v === 'string' ? v.trim().slice(0, n) : '');
  const a = b?.address ?? {};
  try {
    const q = await quoteDelivery(supabaseAdmin(), s(b?.business_id, 60), {
      street: s(a.street, 120), number: s(a.number, 20), neighborhood: s(a.neighborhood, 80), cep: s(a.cep, 12),
    });
    if (!q.ok) return NextResponse.json({ error: QUOTE_MESSAGES[q.code], code: q.code, km: q.km ?? null }, { status: 422 });
    const { band, km } = q;
    return NextResponse.json({ km: Math.round(km * 10) / 10, zone: { id: band.id, name: band.name, fee: band.fee, eta_min: band.eta_min, min_order: band.min_order } });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Serviço indisponível no momento.' }, { status: 500 });
  }
}
