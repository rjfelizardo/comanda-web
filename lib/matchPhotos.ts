// Liga arquivos de foto aos produtos pelo nome do arquivo (ex.: "pizza-calabresa.jpg" -> "Pizza Calabresa").
const STOP = new Set(['de', 'da', 'do', 'das', 'dos', 'com', 'e', 'a', 'o', 'em', 'no', 'na', 'jpg', 'jpeg', 'png', 'webp', 'img', 'foto', 'copia', 'copy']);

export function tokens(s: string): string[] {
  return s
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\.[a-z0-9]{2,5}$/, '')       // extensao
    .replace(/\(\d+\)|\b\d{1,3}\b$/g, ' ')  // "(1)" ou numero no fim
    .replace(/[^a-z0-9]+/g, ' ')
    .split(' ')
    .filter((t) => t && !STOP.has(t));
}

export type Cand = { id: string; name: string };

export function bestMatch(file: string, cands: Cand[]): string | null {
  const ft = tokens(file);
  if (ft.length === 0) return null;
  const fset = new Set(ft);
  let best: { id: string; score: number } | null = null;
  let tie = false;
  for (const c of cands) {
    const ct = tokens(c.name);
    if (ct.length === 0) continue;
    const cset = new Set(ct);
    let inter = 0;
    fset.forEach((t) => { if (cset.has(t)) inter++; });
    const union = fset.size + cset.size - inter;
    let score = inter / union;
    if (inter === fset.size) score = Math.max(score, 0.7); // todas as palavras do arquivo estao no produto
    if (score === 1) return c.id; // igual
    if (!best || score > best.score) { best = { id: c.id, score }; tie = false; }
    else if (score === best.score) tie = true;
  }
  return best && best.score >= 0.5 && !tie ? best.id : null;
}
