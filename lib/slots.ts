import type { Hours } from '@/lib/types';

const toMin = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + (m || 0);
};

// Horarios (de 15 em 15 min) em que a loja funciona no dia `day`, a partir de `earliest`.
export function daySlots(day: Date, hours: Hours[], earliest: Date, step = 15): string[] {
  const d = day.getDay();
  const wins: [number, number][] = [];
  if (hours.length === 0) wins.push([8 * 60, 22 * 60]); // sem horario cadastrado: faixa padrao
  for (const h of hours) {
    const o = toMin(h.opens), c = toMin(h.closes);
    if (h.weekday === d) wins.push(o < c ? [o, c] : [o, 24 * 60]);
    if (h.weekday === (d + 6) % 7 && o > c) wins.push([0, c]);
  }
  const out = new Set<number>();
  for (const [a, b] of wins) {
    for (let m = Math.ceil(a / step) * step; m < b; m += step) out.add(m);
  }
  const base = new Date(day.getFullYear(), day.getMonth(), day.getDate()).getTime();
  return Array.from(out)
    .sort((x, y) => x - y)
    .filter((m) => base + m * 60000 >= earliest.getTime())
    .map((m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`);
}

export function scheduleDays(hours: Hours[], minMinutes: number, maxDays: number, now = new Date()) {
  const earliest = new Date(now.getTime() + minMinutes * 60000);
  const out: { key: string; label: string; date: Date }[] = [];
  for (let i = 0; i <= maxDays; i++) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    if (daySlots(date, hours, earliest).length === 0) continue;
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const label = i === 0 ? 'Hoje' : i === 1 ? 'Amanhã' : date.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' });
    out.push({ key, label, date });
  }
  return out;
}
