import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { normalizePhone } from '@/lib/format';
import { deliveryMode, quoteDelivery, QUOTE_MESSAGES } from '@/lib/deliveryQuote';

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

const MESSAGES: Record<string, string> = {
  business_not_found: 'Loja não encontrada.',
  invalid_phone: 'Telefone inválido. Use DDD + número.',
  invalid_name: 'Informe seu nome.',
  invalid_fulfillment: 'Escolha entrega ou retirada.',
  delivery_not_accepted: 'Esta loja não faz entrega no momento.',
  pickup_not_accepted: 'Esta loja não aceita retirada no momento.',
  business_closed: 'A loja está fechada agora.',
  invalid_items: 'Seu carrinho está vazio ou inválido.',
  invalid_quantity: 'Quantidade inválida.',
  invalid_product: 'Um item do carrinho não está mais disponível. Atualize a página.',
  invalid_option: 'Uma opção escolhida não está mais disponível. Atualize a página.',
  invalid_option_selection: 'Revise as opções obrigatórias dos itens.',
  product_without_price: 'Item sem preço definido.',
  address_required: 'Informe o endereço de entrega.',
  invalid_zone: 'Região de entrega inválida.',
  zone_required: 'Escolha a região de entrega.',
  below_min_order: 'O pedido não atingiu o valor mínimo da loja.',
  below_zone_min_order: 'O pedido não atingiu o mínimo para essa região.',
  invalid_change: 'Valor do troco inválido.',
  too_many_pending_orders: 'Você já tem pedidos aguardando. Aguarde a confirmação da loja.',
  notes_too_long: 'Observação muito longa.',
  coupon_invalid: 'Cupom inválido.',
  coupon_not_started: 'Este cupom ainda não começou.',
  coupon_expired: 'Este cupom expirou.',
  coupon_exhausted: 'Este cupom já atingiu o limite de usos.',
  coupon_already_used: 'Você já usou este cupom.',
  coupon_no_delivery_fee: 'Este cupom é para entrega com taxa.',
  invalid_schedule: 'Horário de agendamento inválido. Escolha outro horário.',
  scheduling_not_accepted: 'Esta loja não aceita pedidos agendados.',
  schedule_outside_hours: 'A loja não funciona nesse horário. Escolha outro.',
  invalid_half: 'Combinação de meio a meio inválida.',
};

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

  const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
  const items = Array.isArray(b.items) ? b.items.slice(0, 40) : [];
  const cleanItems = items.map((i: any) => ({
    product_id: str(i?.product_id, 60),
    half_product_id: str(i?.half_product_id, 60) || null,
    half_product_ids: Array.isArray(i?.half_product_ids) ? i.half_product_ids.slice(0, 5).map((x: unknown) => str(x, 60)) : undefined,
    quantity: Number.isInteger(i?.quantity) ? i.quantity : 0,
    option_ids: Array.isArray(i?.option_ids) ? i.option_ids.slice(0, 30).map((x: unknown) => str(x, 60)) : [],
    notes: str(i?.notes, 200),
  }));

  const fulfillment = b.fulfillment === 'pickup' ? 'pickup' : 'delivery';
  const a = b.address ?? {};
  const address =
    fulfillment === 'delivery'
      ? {
          street: str(a.street, 120),
          number: str(a.number, 20),
          complement: str(a.complement, 80),
          neighborhood: str(a.neighborhood, 80),
          reference: str(a.reference, 120),
          ...(str(a.cep, 12) ? { cep: str(a.cep, 12) } : {}),
        }
      : null;

  const change = Number(b.change_for);
  const coupon = str(b.coupon_code, 20).toUpperCase().replace(/[^A-Z0-9]/g, '');
  const schedMs = typeof b.scheduled_for === 'string' ? Date.parse(b.scheduled_for) : NaN;
  const scheduled = Number.isFinite(schedMs) ? new Date(schedMs).toISOString() : '';
  try {
    const db = supabaseAdmin();
    let zoneId = str(b.zone_id, 60) || null;
    // Entrega por distancia: o servidor refaz o calculo e ignora a regiao enviada pelo navegador.
    if (fulfillment === 'delivery' && (await deliveryMode(db, str(b.business_id, 60))) === 'km') {
      const q = await quoteDelivery(db, str(b.business_id, 60), { street: address!.street, number: address!.number, neighborhood: address!.neighborhood, cep: str(a.cep, 12) });
      if (!q.ok) return NextResponse.json({ error: QUOTE_MESSAGES[q.code] }, { status: 422 });
      zoneId = q.band.id;
    }
    const { data, error } = await db.rpc('place_order', {
      p_business_id: str(b.business_id, 60),
      p_customer_name: str(b.name, 80),
      p_customer_phone: normalizePhone(str(b.phone, 30)),
      p_fulfillment: fulfillment,
      p_payment_method: 'on_delivery',
      p_source: 'web',
      p_address: address,
      p_zone_id: zoneId,
      p_notes: str(b.notes, 500) || null,
      p_change_for: Number.isFinite(change) && change > 0 ? change : null,
      p_items: cleanItems,
      ...(coupon ? { p_coupon_code: coupon } : {}),
      ...(scheduled ? { p_scheduled_for: scheduled } : {}),
    });
    if (error) {
      const code = (error.message || '').split(':')[0].trim();
      const known = code === 'coupon_min_order' ? `Este cupom vale a partir de R$ ${String((error.message.split(':')[1] || '').trim()).replace('.', ',')}.` : MESSAGES[code];
      if (!known) console.error('place_order error', error.message);
      return NextResponse.json({ error: known ?? 'Não foi possível enviar o pedido. Tente novamente.' }, { status: known ? 422 : 500 });
    }
    const row = Array.isArray(data) ? data[0] : data;
    return NextResponse.json({ code: row.code, total: Number(row.total) });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Serviço indisponível no momento.' }, { status: 500 });
  }
}
