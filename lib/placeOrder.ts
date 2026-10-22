import 'server-only';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { normalizePhone } from '@/lib/format';
import { deliveryMode, quoteDelivery, QUOTE_MESSAGES } from '@/lib/deliveryQuote';
import { expirationIso, getToken, mpFetch } from '@/lib/mercadopago';

export const ORDER_MESSAGES: Record<string, string> = {
  business_not_found: 'Loja não encontrada.',
  invalid_phone: 'Telefone inválido. Use DDD + número.',
  invalid_name: 'Informe seu nome.',
  invalid_fulfillment: 'Escolha entrega ou retirada.',
  delivery_not_accepted: 'Esta loja não faz entrega no momento.',
  pix_not_available: 'Esta loja ainda não aceita Pix.',
  pix_failed: 'Não foi possível gerar o Pix agora. Tente novamente ou pague na entrega.',
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


const MESSAGES = ORDER_MESSAGES;

export type OrderResult = { status: number; body: any };

// Nucleo da criacao de pedido (usado pela loja web e pelo atendente do WhatsApp).
export async function createOrder(b: any, host: string, proto: string): Promise<OrderResult> {
  const json = (body: any, init?: { status?: number }): OrderResult => ({ status: init?.status ?? 200, body });
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

  const source: 'web' | 'whatsapp_ai' = b.source === 'whatsapp_ai' ? 'whatsapp_ai' : 'web';
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
  const pix = b.payment === 'pix';
  const coupon = str(b.coupon_code, 20).toUpperCase().replace(/[^A-Z0-9]/g, '');
  const schedMs = typeof b.scheduled_for === 'string' ? Date.parse(b.scheduled_for) : NaN;
  const scheduled = Number.isFinite(schedMs) ? new Date(schedMs).toISOString() : '';
  try {
    const db = supabaseAdmin();
    let zoneId = str(b.zone_id, 60) || null;
    let mpToken: string | null = null;
    if (pix) {
      mpToken = await getToken(db, str(b.business_id, 60));
      if (!mpToken) return json({ error: MESSAGES.pix_not_available }, { status: 422 });
    }
    // Entrega por distancia: o servidor refaz o calculo e ignora a regiao enviada pelo navegador.
    if (fulfillment === 'delivery' && (await deliveryMode(db, str(b.business_id, 60))) === 'km') {
      const q = await quoteDelivery(db, str(b.business_id, 60), { street: address!.street, number: address!.number, neighborhood: address!.neighborhood, cep: str(a.cep, 12) });
      if (!q.ok) return json({ error: QUOTE_MESSAGES[q.code] }, { status: 422 });
      zoneId = q.band.id;
    }
    const { data, error } = await db.rpc('place_order', {
      p_business_id: str(b.business_id, 60),
      p_customer_name: str(b.name, 80),
      p_customer_phone: normalizePhone(str(b.phone, 30)),
      p_fulfillment: fulfillment,
      p_payment_method: pix ? 'online' : 'on_delivery',
      p_source: source,
      p_address: address,
      p_zone_id: zoneId,
      p_notes: str(b.notes, 500) || null,
      p_change_for: !pix && Number.isFinite(change) && change > 0 ? change : null,
      p_items: cleanItems,
      ...(coupon ? { p_coupon_code: coupon } : {}),
      ...(scheduled ? { p_scheduled_for: scheduled } : {}),
    });
    if (error) {
      const code = (error.message || '').split(':')[0].trim();
      const known = code === 'coupon_min_order' ? `Este cupom vale a partir de R$ ${String((error.message.split(':')[1] || '').trim()).replace('.', ',')}.` : MESSAGES[code];
      if (!known) console.error('place_order error', error.message);
      return json({ error: known ?? 'Não foi possível enviar o pedido. Tente novamente.' }, { status: known ? 422 : 500 });
    }
    const row = Array.isArray(data) ? data[0] : data;
    if (!pix || !mpToken) return json({ code: row.code, total: Number(row.total) });

    // Pix: cria a cobranca no Mercado Pago da loja. Se falhar, o pedido e cancelado (nao fica pedido fantasma).
    const bizId = str(b.business_id, 60);
    const { data: ord } = await db.from('orders').select('id').eq('business_id', bizId).eq('code', row.code).maybeSingle();
    const host = host;
    const proto = proto;
    const pay = ord
      ? await mpFetch(mpToken, '/v1/payments', {
          method: 'POST',
          headers: { 'X-Idempotency-Key': ord.id },
          body: JSON.stringify({
            transaction_amount: Number(row.total),
            description: `Pedido ${row.code}`,
            payment_method_id: 'pix',
            external_reference: ord.id,
            date_of_expiration: expirationIso(30),
            notification_url: `${proto}://${host}/api/mp/webhook?b=${bizId}`,
            payer: { email: `pedido-${String(row.code).toLowerCase()}@bridgeatravessia.com.br`, first_name: str(b.name, 40) || 'Cliente' },
          }),
        })
      : null;
    const tx = pay?.json?.point_of_interaction?.transaction_data;
    if (!ord || !pay || !pay.ok || !tx?.qr_code) {
      console.error('mp pix', pay?.status, JSON.stringify(pay?.json ?? {}).slice(0, 400));
      if (ord) await db.rpc('set_order_status', { p_order_id: ord.id, p_status: 'cancelled' });
      return json({ error: MESSAGES.pix_failed }, { status: 502 });
    }
    const expires = pay.json.date_of_expiration ?? null;
    await db.from('orders').update({ pix_code: tx.qr_code, pix_qr: tx.qr_code_base64 ?? null, pix_expires_at: expires, mp_payment_id: String(pay.json.id) }).eq('id', ord.id);
    return json({ code: row.code, total: Number(row.total), pix: { code: tx.qr_code, qr: tx.qr_code_base64 ?? null, expires_at: expires } });
  } catch (e) {
    console.error(e);
    return json({ error: 'Serviço indisponível no momento.' }, { status: 500 });
  }
}
