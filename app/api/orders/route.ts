import { NextResponse } from 'next/server';
import { createOrder } from '@/lib/placeOrder';

export const runtime = 'nodejs';

// Limite simples por IP (por instancia). A defesa final contra abuso esta no banco (place_order).
const hits = new Map<string, number[]>();
function limited(ip: string) {
  const now = Date.now();
  const arr = (hits.get(ip) ?? []).filter((t) => now - t < 10 * 60 * 1000);
  arr.push(now);
  hits.set(ip, arr);
  if (hits.size > 5000) hits.clear();
  return arr.length > 6;
}

export async function POST(req: Request) {
  const ip = (req.headers.get('x-forwarded-for') ?? 'unknown').split(',')[0].trim();
  if (limited(ip)) return NextResponse.json({ error: 'Muitas tentativas. Tente de novo em alguns minutos.' }, { status: 429 });

  const raw = await req.text();
  if (raw.length > 30_000) return NextResponse.json({ error: 'Pedido grande demais.' }, { status: 413 });

  let b: any;
  try {
    b = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: 'Requisição inválida.' }, { status: 400 });
  }
  b.source = 'web'; // o navegador nunca escolhe a origem
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host') ?? '';
  const proto = req.headers.get('x-forwarded-proto') ?? 'https';
  const r = await createOrder(b, host, proto);
  return NextResponse.json(r.body, { status: r.status });
}
