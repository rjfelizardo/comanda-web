import 'server-only';

export type LatLng = { lat: number; lng: number };
const cache = new Map<string, LatLng | null>();
let lastNominatim = 0;

async function viaGoogle(q: string, key: string): Promise<LatLng | null> {
  const r = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(q)}&region=br&key=${key}`, { cache: 'no-store' });
  const j: any = await r.json();
  const loc = j?.results?.[0]?.geometry?.location;
  return loc ? { lat: Number(loc.lat), lng: Number(loc.lng) } : null;
}

async function viaNominatim(q: string): Promise<LatLng | null> {
  // politica do Nominatim: no maximo 1 consulta por segundo e User-Agent identificado
  const wait = lastNominatim + 1100 - Date.now();
  if (wait > 0) await new Promise((res) => setTimeout(res, wait));
  lastNominatim = Date.now();
  const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=br&q=${encodeURIComponent(q)}`, {
    headers: { 'User-Agent': 'ComandaApp/1.0 (contato@bridgeatravessia.com.br)', 'Accept-Language': 'pt-BR' },
    cache: 'no-store',
  });
  if (!r.ok) return null;
  const j: any = await r.json();
  return j?.[0] ? { lat: Number(j[0].lat), lng: Number(j[0].lon) } : null;
}

export async function geocodeText(q: string): Promise<LatLng | null> {
  const key = q.trim().toLowerCase();
  if (cache.has(key)) return cache.get(key)!;
  let res: LatLng | null = null;
  try {
    // Google so quando GEOCODER=google (e a chave existir); senao usa o mapa gratuito.
    const g = process.env.GEOCODER === 'google' ? process.env.GOOGLE_MAPS_API_KEY : '';
    res = g ? await viaGoogle(q, g) : await viaNominatim(q);
  } catch {
    return null; // falha de rede nao fica em cache
  }
  if (cache.size > 2000) cache.clear();
  cache.set(key, res);
  return res;
}

export type Addr = { street?: string; number?: string; neighborhood?: string; cep?: string };

// Tenta do mais preciso para o menos preciso.
export async function geocodeAddress(a: Addr, city: string, state: string): Promise<LatLng | null> {
  const tail = [city, state, 'Brasil'].filter(Boolean).join(', ');
  const tries: string[] = [];
  if (a.street && a.number) tries.push([`${a.street}, ${a.number}`, a.neighborhood, tail].filter(Boolean).join(', '));
  if (a.street) tries.push([a.street, a.neighborhood, tail].filter(Boolean).join(', '));
  if (a.cep) tries.push(`${a.cep}, ${tail}`);
  for (const t of tries) {
    const r = await geocodeText(t);
    if (r) return r;
  }
  return null;
}

export function haversineKm(a: LatLng, b: LatLng) {
  const R = 6371;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
