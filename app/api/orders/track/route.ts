import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { normalizePhone } from '@/lib/format';

export const runtime = 'nodejs';

const hits = new Map<string, number[]>();
function limited(ip: string) {
  const now = Date.now();
  const arr = (hits.get(ip) ?? []).filter((t) => now - t < 10 * 60 * 1000);
  arr.push(now);
  hits.set(ip, arr);
  if (hits.size > 5000) hits.clear();
  return arr.length > 90;
}

// Acompanhamento do cliente: so devolve pedidos cujo CODIGO e TELEFONE batem. Nao devolve endereco nem telefone.
export async function POST(req: Request) {
  const ip = (req.headers.get('x-forwarded-for') ?? 'unknown').split(',')[0].trim();
  if (limited(ip)) return NextResponse.json({ error: 'Muitas consultas. Tente de novo em alguns minutos.' }, { status: 429 });

  let b: any;
  try {
    b = JSON.parse(await req.text());
  } catch {
    return NextResponse.json({ error: 'Requisição inválida.' }, { status: 400 });
  }
  const businessId = typeof b.business_id === 'string' ? b.business_id.slice(0, 60) : '';
  const entries = (Array.isArray(b.entries) ? b.entries : [])
    .slice(0, 20)
    .map((e: any) => ({
      code: typeof e?.code === 'string' ? e.code.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12) : '',
      phone: normalizePhone(typeof e?.phone === 'string' ? e.phone.slice(0, 30) : ''),
    }))
    .filter((e: any) => e.code && e.phone.length >= 10);
  if (!businessId || entries.length === 0) return NextResponse.json({ orders: [] });

  try {
    const db = supabaseAdmin();
    const byPhone = new Map<string, string[]>();
    for (const e of entries) byPhone.set(e.phone, [...(byPhone.get(e.phone) ?? []), e.code]);
    const found: any[] = [];
    for (const [phone, codes] of Array.from(byPhone.entries())) {
      const { data } = await db
        .from('orders')
        .select('id,code,status,fulfillment,payment_method,payment_status,total,created_at,scheduled_for')
        .eq('business_id', businessId)
        .eq('customer_phone', phone)
        .in('code', codes);
      found.push(...((data ?? []) as any[]));
    }
    const ids = found.map((o) => o.id);
    const { data: items } = ids.length
      ? await db.from('order_items').select('order_id,product_name,quantity,options').in('order_id', ids)
      : { data: [] as any[] };
    const orders = found
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
      .map(({ id, ...o }) => ({
        ...o,
        total: Number(o.total),
        items: ((items ?? []) as any[])
          .filter((i) => i.order_id === id)
          .map((i) => ({
            name: i.product_name,
            quantity: i.quantity,
            options: Array.isArray(i.options) ? i.options.map((x: any) => x?.name).filter(Boolean) : [],
          })),
      }));
    return NextResponse.json({ orders });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Serviço indisponível no momento.' }, { status: 500 });
  }
}
