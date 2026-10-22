import 'server-only';
import { geocodeAddress, haversineKm, type Addr } from '@/lib/geocode';

export const QUOTE_MESSAGES: Record<string, string> = {
  no_store_location: 'A loja ainda não configurou a entrega por distância.',
  not_found: 'Não conseguimos localizar esse endereço. Confira o CEP, a rua e o número.',
  out_of_range: 'Esse endereço está fora da nossa área de entrega.',
};

export type Band = { id: string; name: string; fee: number; min_order: number; eta_min: number | null; max_km: number };
export type Quote =
  | { ok: true; km: number; band: Band }
  | { ok: false; code: 'no_store_location' | 'not_found' | 'out_of_range'; km?: number };

export async function deliveryMode(db: any, businessId: string): Promise<'zones' | 'km'> {
  const r = await db.from('businesses').select('delivery_mode').eq('id', businessId).maybeSingle();
  return !r.error && r.data?.delivery_mode === 'km' ? 'km' : 'zones';
}

export async function quoteDelivery(db: any, businessId: string, addr: Addr): Promise<Quote> {
  const b = await db.from('businesses').select('store_lat,store_lng,city,state').eq('id', businessId).maybeSingle();
  const biz = b.data;
  if (!biz || biz.store_lat == null || biz.store_lng == null) return { ok: false, code: 'no_store_location' };
  const z = await db.from('delivery_zones').select('id,name,fee,min_order,eta_min,max_km').eq('business_id', businessId).eq('is_active', true).not('max_km', 'is', null).order('max_km');
  const bands: Band[] = ((z.data ?? []) as any[]).map((x) => ({ ...x, fee: Number(x.fee), min_order: Number(x.min_order), max_km: Number(x.max_km) }));
  const pt = await geocodeAddress(addr, biz.city ?? '', biz.state ?? '');
  if (!pt) return { ok: false, code: 'not_found' };
  const km = haversineKm({ lat: Number(biz.store_lat), lng: Number(biz.store_lng) }, pt);
  const band = bands.find((x) => km <= x.max_km);
  return band ? { ok: true, km, band } : { ok: false, code: 'out_of_range', km };
}
