import 'server-only';

const API = 'https://api.mercadopago.com';

export async function mpFetch(token: string, path: string, init: RequestInit = {}) {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(init.headers ?? {}) },
    cache: 'no-store',
  });
  const json: any = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, json };
}

export async function getToken(db: any, businessId: string): Promise<string | null> {
  const { data, error } = await db.rpc('get_mp_token', { p_business: businessId });
  return !error && typeof data === 'string' && data ? data : null;
}

// Vencimento no fuso de Brasilia, no formato que o Mercado Pago exige.
export function expirationIso(minutes: number) {
  return new Date(Date.now() + minutes * 60000 - 3 * 3600000).toISOString().replace('Z', '-03:00');
}

// Confere o pagamento DIRETO no Mercado Pago (nao confia no corpo do webhook) e marca o pedido como pago.
export async function settlePayment(db: any, businessId: string, paymentId: string): Promise<'paid' | 'pending' | 'ignored'> {
  if (!/^[0-9]{3,20}$/.test(paymentId)) return 'ignored';
  const token = await getToken(db, businessId);
  if (!token) return 'ignored';
  const p = await mpFetch(token, `/v1/payments/${paymentId}`);
  if (!p.ok) return 'ignored';
  const orderId = String(p.json.external_reference ?? '');
  if (!orderId) return 'ignored';
  const { data: order } = await db.from('orders').select('id,business_id,total,payment_status,mp_payment_id').eq('id', orderId).maybeSingle();
  if (!order || order.business_id !== businessId || String(order.mp_payment_id ?? '') !== String(paymentId)) return 'ignored';
  if (order.payment_status === 'paid') return 'paid';
  if (p.json.status !== 'approved') return 'pending';
  if (Math.abs(Number(p.json.transaction_amount) - Number(order.total)) > 0.009) return 'ignored';
  const { error } = await db.rpc('mark_order_paid', { p_order_id: order.id, p_reference: `mp:${paymentId}` });
  if (error) {
    console.error('mark_order_paid', error.message);
    return 'pending';
  }
  return 'paid';
}
