// Leitura de planilha CSV de cardapio (Excel/Google Sheets). Sem dependencias.
// Colunas: categoria; produto; descricao; preco; grupo; minimo; maximo; opcoes
// opcoes: "Pequena=30|Media=40|Grande=55"  (valor depois do "=" e opcional)

export type ImpOption = { name: string; price: number };
export type ImpGroup = { name: string; min: number; max: number; options: ImpOption[] };
export type ImpProduct = { category: string; name: string; description: string; price: number; groups: ImpGroup[]; line: number; half: boolean };
export type ImpResult = { products: ImpProduct[]; errors: string[] };

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

function splitCsv(text: string): string[][] {
  const t = text.replace(/^﻿/, '');
  const first = t.split(/\r?\n/, 1)[0] ?? '';
  const count = (c: string) => first.split(c).length - 1;
  const delim = count(';') >= count(',') && count(';') >= count('\t') ? ';' : count('\t') > count(',') ? '\t' : ',';
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = '';
  let q = false;
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (q) {
      if (ch === '"') {
        if (t[i + 1] === '"') { cur += '"'; i++; } else q = false;
      } else cur += ch;
    } else if (ch === '"') q = true;
    else if (ch === delim) { row.push(cur); cur = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && t[i + 1] === '\n') i++;
      row.push(cur); cur = '';
      if (row.some((c) => c.trim() !== '')) rows.push(row);
      row = [];
    } else cur += ch;
  }
  row.push(cur);
  if (row.some((c) => c.trim() !== '')) rows.push(row);
  return rows;
}

function money(s: string): number {
  const x = s.replace(/[R$\s]/g, '');
  if (x === '') return 0;
  // "1.234,56" -> 1234.56 ; "45,90" -> 45.90 ; "45.90" -> 45.90
  const n = /,/.test(x) ? Number(x.replace(/\./g, '').replace(',', '.')) : Number(x);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : NaN;
}

export function parseMenuCsv(text: string): ImpResult {
  const rows = splitCsv(text);
  const errors: string[] = [];
  if (rows.length < 2) return { products: [], errors: ['A planilha está vazia ou sem linhas de produtos.'] };
  const head = rows[0].map(norm);
  const col = (...names: string[]) => head.findIndex((h) => names.includes(h));
  const iCat = col('categoria', 'category');
  const iName = col('produto', 'nome', 'item', 'product');
  const iDesc = col('descricao', 'description');
  const iPrice = col('preco', 'preco base', 'valor', 'price');
  const iGrp = col('grupo', 'opcao grupo', 'grupo de opcoes');
  const iMin = col('minimo', 'min');
  const iMax = col('maximo', 'max');
  const iOpts = col('opcoes', 'opcao', 'options');
  const iHalf = col('meio a meio', 'meio_a_meio', 'meioameio', 'meio-a-meio');
  if (iName < 0) return { products: [], errors: ['Não achei a coluna "produto" na primeira linha. Use o modelo da tela de importação.'] };
  if (rows.length > 801) errors.push('Planilha muito grande: só as primeiras 800 linhas serão lidas.');

  const get = (r: string[], i: number) => (i >= 0 ? (r[i] ?? '').trim() : '');
  const map = new Map<string, ImpProduct>();
  rows.slice(1, 801).forEach((r, idx) => {
    const line = idx + 2;
    const name = get(r, iName);
    if (!name) return errors.push(`Linha ${line}: produto sem nome.`);
    if (name.length > 120) return errors.push(`Linha ${line}: nome do produto muito longo.`);
    const category = get(r, iCat) || 'Outros';
    if (category.length > 80) return errors.push(`Linha ${line}: nome da categoria muito longo.`);
    const key = norm(category) + '|' + norm(name);
    let p = map.get(key);
    if (!p) {
      p = { category, name, description: '', price: 0, groups: [], line, half: false };
      map.set(key, p);
    }
    if (/^(sim|s|1|true|x)$/i.test(norm(get(r, iHalf)))) p.half = true;
    const desc = get(r, iDesc);
    if (desc && !p.description) p.description = desc.slice(0, 600);
    const priceStr = get(r, iPrice);
    if (priceStr) {
      const v = money(priceStr);
      if (Number.isNaN(v)) errors.push(`Linha ${line}: preço inválido “${priceStr}”.`);
      else if (!p.price) p.price = v;
    }
    const g = get(r, iGrp);
    const optsStr = get(r, iOpts);
    if (!g && !optsStr) return;
    if (!g) return errors.push(`Linha ${line}: opções sem o nome do grupo.`);
    const options: ImpOption[] = [];
    for (const part of optsStr.split('|')) {
      const t = part.trim();
      if (!t) continue;
      const eq = t.lastIndexOf('=');
      const oName = (eq >= 0 ? t.slice(0, eq) : t).trim();
      const oPrice = eq >= 0 ? money(t.slice(eq + 1)) : 0;
      if (!oName || oName.length > 80) { errors.push(`Linha ${line}: nome de opção inválido.`); continue; }
      if (Number.isNaN(oPrice)) { errors.push(`Linha ${line}: valor inválido na opção “${oName}”.`); continue; }
      options.push({ name: oName, price: oPrice });
    }
    if (options.length === 0) return errors.push(`Linha ${line}: o grupo “${g}” não tem opções.`);
    const min = get(r, iMin) === '' ? 0 : parseInt(get(r, iMin), 10);
    const max = get(r, iMax) === '' ? 1 : parseInt(get(r, iMax), 10);
    if (!Number.isInteger(min) || !Number.isInteger(max) || min < 0 || max < 1 || max < min) {
      return errors.push(`Linha ${line}: mínimo/máximo inválidos no grupo “${g}”.`);
    }
    p.groups.push({ name: g.slice(0, 80), min, max, options });
  });

  const products = Array.from(map.values()).filter((p) => {
    if (p.price <= 0 && !p.groups.some((g) => g.min > 0)) {
      errors.push(`Linha ${p.line}: “${p.name}” sem preço (informe o preço ou um grupo obrigatório com valores).`);
      return false;
    }
    return true;
  });
  return { products, errors };
}

export const TEMPLATE_CSV =
  '﻿categoria;produto;descricao;preco;grupo;minimo;maximo;opcoes;meio_a_meio\r\n' +
  'Pizzas;Pizza Calabresa;Mussarela, calabresa e cebola;0;Tamanho;1;1;Pequena=30|Média=40|Grande=55;sim\r\n' +
  'Pizzas;Pizza Calabresa;;;Borda recheada;0;1;Catupiry=8|Cheddar=8;\r\n' +
  'Bebidas;Guaraná 2L;Gelado;12,00;;;;;\r\n';
