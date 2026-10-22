import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { settlePayment } from '@/lib/mercadopago';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// O Mercado Pago avisa aqui. Nada do corpo e confiado: o pagamento e consultado de novo na API deles.
export async function POST(req: Request) {
  const url = new URL(req.url);
  const businessId = (url.searchParams.get('b') ?? '').slice(0, 60);
  let id = url.searchParams.get('data.id') ?? url.searchParams.get('id') ?? '';
  let type = url.searchParams.get('type') ?? url.searchParams.get('topic') ?? '';
  try {
    const body: any = await req.json();
    id = id || String(body?.data?.id ?? body?.id ?? '');
    type = type || String(body?.type ?? body?.topic ?? '');
  } catch {}
  if (businessId && id && (!type || type === 'payment')) {
    try {
      await settlePayment(supabaseAdmin(), businessId, id);
    } catch (e) {
      console.error('mp webhook', e);
      return NextResponse.json({ ok: false }, { status: 500 }); // o MP tenta de novo
    }
  }
  return NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.json({ ok: true });
}
