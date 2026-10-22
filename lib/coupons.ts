import { brl } from '@/lib/format';
import type { PublicCoupon } from '@/lib/types';

export function couponTitle(c: PublicCoupon) {
  return c.kind === 'percent' ? `${c.value}% de desconto` : c.kind === 'fixed' ? `${brl(c.value)} de desconto` : 'Entrega grátis';
}
export function couponRule(c: PublicCoupon) {
  const parts: string[] = [];
  if (c.min_order > 0) parts.push(`em pedidos a partir de ${brl(c.min_order)}`);
  if (c.expires_at) parts.push(`vale até ${new Date(c.expires_at).toLocaleDateString('pt-BR')}`);
  if (c.uses_left !== null && c.uses_left <= 20) parts.push(`restam ${c.uses_left}`);
  return parts.join(' · ');
}
