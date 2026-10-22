import { NextResponse } from 'next/server';
import { geocodeText } from '@/lib/geocode';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const hits = new Map<string, number[]>();

// Usado pelo painel para localizar a loja a partir do endereco cadastrado.
export async function POST(req: Request) {
  const ip = (req.headers.get('x-forwarded-for') ?? 'unknown').split(',')[0].trim();
  const now = Date.now();
  const arr = (hits.get(ip) ?? []).filter((t) => now - t < 10 * 60 * 1000);
  arr.push(now);
  hits.set(ip, arr);
  if (hits.size > 2000) hits.clear();
  if (arr.length > 15) return NextResponse.json({ error: 'Muitas consultas. Aguarde alguns minutos.' }, { status: 429 });
  let b: any;
  try { b = await req.json(); } catch { return NextResponse.json({ error: 'Requisição inválida.' }, { status: 400 }); }
  const q = typeof b?.q === 'string' ? b.q.trim().slice(0, 250) : '';
  if (q.length < 8) return NextResponse.json({ error: 'Endereço muito curto.' }, { status: 400 });
  const r = await geocodeText(q);
  if (!r) return NextResponse.json({ error: 'Não encontramos esse endereço. Inclua rua, número, bairro e cidade.' }, { status: 404 });
  return NextResponse.json(r);
}
