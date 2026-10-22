import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

const hits = new Map<string, number[]>();
function limited(ip: string) {
  const now = Date.now();
  const arr = (hits.get(ip) ?? []).filter((t) => now - t < 10 * 60 * 1000);
  arr.push(now);
  hits.set(ip, arr);
  if (hits.size > 5000) hits.clear();
  return arr.length > 30;
}

const MESSAGES: Record<string, string> = {
  coupon_invalid: 'Cupom inválido.',
  coupon_not_started: 'Este cupom ainda não começou.',
  coupon_expired: 'Este cupom expirou.',
  coupon_exhausted: 'Este cupom já atingiu o limite de usos.',
  coupon_already_used: 'Você já usou este cupom.',
  coupon_no_delivery_fee: 'Este cupom é para entrega com taxa.',
};

export async function POST(req: Request) {
  const ip = (req.headers.get('x-forwarded-for') ?? 'unknown').split(',')[0].trim();
  if (limited(ip)) return NextResponse.json({ error: 'Muitas tentativas. Tente de novo em alguns minutos.' }, { status: 429 });
  let b: any;
  try { b = JSON.parse(await req.text()); } catch { return NextResponse.json({ error: 'Requisição inválida.' }, { status: 400 }); }
  const code = String(b.code ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 20);
  const n = (v: unknown) => (Number.isFinite(Number(v)) && Number(v) >= 0 ? Number(v) : 0);
  if (!code) return NextResponse.json({ error: 'Digite o cupom.' }, { status: 422 });
  try {
    const { data, error } = await supabaseAdmin().rpc('check_coupon', {
      p_business_id: String(b.business_id ?? '').slice(0, 60),
      p_code: code,
      p_phone: String(b.phone ?? '').slice(0, 30),
      p_subtotal: n(b.subtotal),
      p_fee: n(b.fee),
    });
    if (error) {
      const c = (error.message || '').split(':')[0].trim();
      if (c === 'coupon_min_order') {
        return NextResponse.json({ error: `Este cupom vale a partir de R$ ${(error.message.split(':')[1] || '').trim().replace('.', ',')}.` }, { status: 422 });
      }
      return NextResponse.json({ error: MESSAGES[c] ?? 'Cupom inválido.' }, { status: 422 });
    }
    return NextResponse.json({ discount: Number(data) });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Serviço indisponível no momento.' }, { status: 500 });
  }
}
