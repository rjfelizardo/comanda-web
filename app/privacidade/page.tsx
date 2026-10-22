import Link from 'next/link';

export const metadata = { title: 'Política de Privacidade — Comanda' };

export default function Privacidade() {
  return (
    <main className="mx-auto max-w-2xl px-5 py-10">
      <Link href="/" className="text-sm font-semibold text-brand-dark underline">← Comanda</Link>
      <h1 className="mt-4 font-display text-3xl font-extrabold">Política de Privacidade</h1>
      <p className="mt-1 text-sm text-ink/60">Atualizada em 22/10/2026</p>

      <div className="mt-6 space-y-5 text-ink/80">
        <section>
          <h2 className="font-bold text-ink">Quem somos</h2>
          <p>O Comanda é uma plataforma de cardápio digital e pedidos de delivery operada pelo Grupo Bridge (CNPJ 48.435.227/0001-96). Lojistas usam o Comanda para receber pedidos de seus clientes pela internet e pelo WhatsApp.</p>
        </section>
        <section>
          <h2 className="font-bold text-ink">Quais dados coletamos</h2>
          <p>Ao fazer um pedido (pelo site ou pelo atendimento no WhatsApp) coletamos nome, telefone, endereço de entrega, itens do pedido, forma de pagamento e as mensagens trocadas com o atendente. Do lojista coletamos nome, e-mail e dados da loja.</p>
        </section>
        <section>
          <h2 className="font-bold text-ink">Para que usamos</h2>
          <p>Usamos os dados apenas para processar e entregar o pedido, calcular a taxa de entrega, confirmar pagamentos, atender o cliente e permitir que a loja gerencie suas vendas. Não vendemos dados pessoais.</p>
        </section>
        <section>
          <h2 className="font-bold text-ink">Com quem compartilhamos</h2>
          <p>Os dados do pedido são compartilhados com a loja escolhida pelo cliente. Para funcionar, usamos prestadores de serviço: hospedagem e banco de dados (Vercel e Supabase), pagamento (Mercado Pago), mensagens (WhatsApp / Meta) e inteligência artificial para entender as mensagens do atendimento (Anthropic e, para áudios, Groq). Cada um trata os dados conforme suas próprias políticas.</p>
        </section>
        <section>
          <h2 className="font-bold text-ink">Por quanto tempo guardamos</h2>
          <p>Guardamos os dados enquanto forem necessários para o serviço e para cumprir obrigações legais. Você pode pedir a exclusão a qualquer momento.</p>
        </section>
        <section>
          <h2 className="font-bold text-ink">Seus direitos (LGPD)</h2>
          <p>Você pode solicitar acesso, correção, exclusão ou portabilidade dos seus dados, e revogar consentimentos, escrevendo para o contato abaixo.</p>
        </section>
        <section>
          <h2 className="font-bold text-ink">Exclusão de dados</h2>
          <p>Para excluir seus dados, envie um e-mail com o telefone usado nos pedidos para o contato abaixo. Atendemos em até 15 dias.</p>
        </section>
        <section>
          <h2 className="font-bold text-ink">Contato</h2>
          <p>contato@bridgeatravessia.com.br</p>
        </section>
      </div>
    </main>
  );
}
