// Cupom de pedido para impressora termica (80mm) ou papel comum. Abre uma janela e imprime.
const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
const money = (n: number) => Number(n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function printOrder(businessName: string, o: any) {
  const w = window.open('', '_blank', 'width=420,height=700');
  if (!w) { alert('Libere pop-ups para imprimir.'); return; }
  const a = o.address || {};
  const when = new Date(o.created_at).toLocaleString('pt-BR');
  const items = (o.items || [])
    .map((i: any) => `<div class="it"><b>${i.quantity}x ${esc(i.product_name)}</b>${
      i.options?.length ? `<div class="sm">${esc(i.options.map((x: any) => x.name).join(', '))}</div>` : ''}${
      i.notes ? `<div class="sm">Obs: ${esc(i.notes)}</div>` : ''}</div>`)
    .join('');
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Pedido ${esc(o.code)}</title>
<style>
@page{margin:4mm}
body{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:13px;width:72mm;margin:0 auto;color:#000}
h1{font-size:16px;text-align:center;margin:4px 0}
.c{text-align:center}.sm{font-size:12px;margin-left:12px}
hr{border:0;border-top:1px dashed #000;margin:8px 0}
.it{margin:5px 0}.r{display:flex;justify-content:space-between}
.big{font-size:20px;font-weight:bold;text-align:center}
</style></head><body>
<h1>${esc(businessName)}</h1>
<div class="big">PEDIDO #${esc(o.code)}</div>
<div class="c">${esc(when)}</div><hr>
<div><b>${esc(o.customer_name)}</b></div><div>${esc(o.customer_phone)}</div>
<div><b>${o.fulfillment === 'delivery' ? 'ENTREGA' : 'RETIRADA NO BALCAO'}</b></div>
${o.fulfillment === 'delivery' ? `<div>${esc([a.street, a.number].filter(Boolean).join(', '))}${a.neighborhood ? ' - ' + esc(a.neighborhood) : ''}</div>${a.complement ? `<div>${esc(a.complement)}</div>` : ''}${a.reference ? `<div>Ref: ${esc(a.reference)}</div>` : ''}` : ''}
${o.scheduled_for ? `<div><b>AGENDADO: ${esc(new Date(o.scheduled_for).toLocaleString('pt-BR'))}</b></div>` : ''}
<hr>${items}<hr>
${o.notes ? `<div><b>Obs:</b> ${esc(o.notes)}</div><hr>` : ''}
<div class="r"><span>Subtotal</span><span>${money(o.subtotal)}</span></div>
${o.delivery_fee > 0 ? `<div class="r"><span>Entrega</span><span>${money(o.delivery_fee)}</span></div>` : ''}
${o.discount > 0 ? `<div class="r"><span>Desconto</span><span>-${money(o.discount)}</span></div>` : ''}
<div class="r"><b>TOTAL</b><b>${money(o.total)}</b></div>
<div>${o.payment_method === 'online' ? (o.payment_status === 'paid' ? 'PAGO ONLINE' : 'Pagamento online (pendente)') : 'Pagar na ' + (o.fulfillment === 'delivery' ? 'entrega' : 'retirada')}</div>
${o.change_for ? `<div>Troco para ${money(o.change_for)}</div>` : ''}
<hr><div class="c">Comanda</div>
<script>window.onload=function(){window.focus();window.print();setTimeout(function(){window.close()},500)}</script>
</body></html>`);
  w.document.close();
}
