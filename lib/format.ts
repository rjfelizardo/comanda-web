export const brl = (n: number | string | null | undefined) =>
  Number(n ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export const onlyDigits = (s: string) => (s || '').replace(/\D/g, '');

// Telefone BR: aceita com/sem DDI. Retorna so digitos com 55 na frente.
export function normalizePhone(raw: string): string {
  const d = onlyDigits(raw);
  if (d.length === 10 || d.length === 11) return '55' + d;
  return d;
}

export const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);

export const RESERVED_SLUGS = [
  'login', 'cadastro', 'painel', 'api', 'auth', 'admin', 'app', 'entrar', 'sair', 'planos',
  'comanda', 'suporte', 'ajuda', 'termos', 'privacidade', 'static', 'public', 'pedido',
];

export const STATUS_LABEL: Record<string, string> = {
  pending_approval: 'Novo',
  approved: 'Aprovado',
  rejected: 'Recusado',
  awaiting_payment: 'Aguardando pagamento',
  paid: 'Pago',
  in_preparation: 'Em preparo',
  ready: 'Pronto',
  out_for_delivery: 'Saiu para entrega',
  delivered: 'Entregue',
  cancelled: 'Cancelado',
};

export const WEEKDAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
