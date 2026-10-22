// Endereco publico da loja: usa o subdominio (loja.comanda...) quando estamos no dominio oficial.
const BASE = 'comanda.bridgeatravessia.com.br';

export function storeUrl(slug: string): string {
  if (typeof window === 'undefined') return `/${slug}`;
  const h = location.hostname;
  if (h === BASE || h.endsWith('.' + BASE)) return `${location.protocol}//${slug}.${BASE}`;
  return `${location.origin}/${slug}`;
}
