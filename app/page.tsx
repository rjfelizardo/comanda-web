import Link from 'next/link';

const CTA = '/login?modo=cadastro';

const FEATURES = [
  { i: '🍕', t: 'Meio a meio de verdade', d: 'O cliente escolhe o sabor, o tamanho e adiciona até 4 sabores. O preço segue o sabor mais caro, sem você calcular nada.' },
  { i: '💠', t: 'Pix na hora do pedido', d: 'Conecte seu Mercado Pago e o cliente paga com QR Code ou copia e cola. O pedido só chega pago, confirmado automaticamente.' },
  { i: '🛵', t: 'Taxa de entrega automática', d: 'Por bairro (com busca por CEP) ou por faixas de km a partir da sua loja. O cliente já vê o valor certo.' },
  { i: '🔔', t: 'Painel com aviso sonoro', d: 'Pedido novo toca no painel. Aceite, prepare, saia pra entrega e finalize com um toque, direto do celular ou tablet.' },
  { i: '📸', t: 'Cardápio pronto em minutos', d: 'Importe produtos por planilha e as fotos de uma vez só, pelo nome do arquivo. Sem cadastrar item por item.' },
  { i: '🎟️', t: 'Cupons, horários e agendamento', d: 'Crie cupons de desconto, defina horário de funcionamento e deixe o cliente agendar o pedido.' },
  { i: '🖨️', t: 'Impressão e relatórios', d: 'Imprima o pedido pra cozinha e acompanhe vendas, ticket médio e produtos mais pedidos.' },
  { i: '🔗', t: 'Seu link, sua marca', d: 'Endereço próprio, tipo suapizzaria.comanda…, pra colocar na bio, no WhatsApp e no QR Code.' },
];

const STEPS = [
  { n: '1', t: 'Crie sua loja', d: 'Cadastro rápido, sem cartão. Escolha o nome e o endereço do seu link.' },
  { n: '2', t: 'Monte o cardápio', d: 'Cadastre ou importe seus produtos, fotos, tamanhos e adicionais.' },
  { n: '3', t: 'Divulgue o link', d: 'Mande no WhatsApp e no Instagram. Os pedidos caem no seu painel.' },
];

const SUPPORT = [
  { i: '🎓', t: 'Treinamento da sua equipe', d: 'Mostramos para você e para quem atende como usar o painel: receber pedido, aceitar, avançar e finalizar, imprimir, cadastrar produto e ajustar preços e horários.' },
  { i: '🧰', t: 'Implantação guiada', d: 'Ajudamos a montar o cardápio, importar produtos e fotos, configurar taxa de entrega, Pix e o atendente de WhatsApp, até a loja estar pronta para vender.' },
  { i: '💬', t: 'Suporte por WhatsApp', d: 'Dúvida ou problema? Fale direto com a gente pelo WhatsApp ou e-mail, em horário comercial. Sem fila de robô e sem ticket.' },
  { i: '📘', t: 'Material de apoio', d: 'Passo a passo simples para cada tarefa do dia a dia, para novos funcionários aprenderem rápido, sem depender de você.' },
];

const FAQ = [
  { q: 'Vocês treinam a minha equipe?', a: 'Sim. Fazemos o treinamento de quem vai usar o painel (atendimento, cozinha e caixa) e deixamos o passo a passo por escrito. Quando entrar um funcionário novo, é só pedir um novo treinamento.' },
  { q: 'Como funciona o suporte?', a: 'Pelo WhatsApp e por e-mail, em horário comercial. Problemas que impedem a loja de vender têm prioridade.' },
  { q: 'Preciso de computador?', a: 'Não. O painel e a loja funcionam no celular e no tablet, direto no navegador. Nada pra instalar.' },
  { q: 'O cliente precisa baixar um app?', a: 'Não. Ele abre o seu link, escolhe e pede. Simples como mandar uma mensagem.' },
  { q: 'Como recebo o dinheiro do Pix?', a: 'Direto na sua conta do Mercado Pago. O Comanda não segura o seu dinheiro. Você também pode aceitar pagamento na entrega.' },
  { q: 'Serve só pra pizzaria?', a: 'Serve para pizzaria, padaria, lanchonete, hamburgueria, açaí, marmitaria e qualquer delivery com cardápio.' },
  { q: 'Quanto custa?', a: 'Os planos serão divulgados em breve. Quem criar a loja agora já acompanha o lançamento.' },
  { q: 'Vai ter atendente no WhatsApp?', a: 'Sim. O atendente com inteligência artificial responde seus clientes no WhatsApp por texto ou áudio, mostra o cardápio, anota o pedido e envia o Pix. Você acompanha tudo no painel e pode assumir a conversa quando quiser.' },
];

export default function Home() {
  return (
    <main className="overflow-x-hidden">
      {/* topo */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="" width={36} height={36} />
          <span className="font-display text-xl font-extrabold tracking-tight">Comanda</span>
        </div>
        <nav className="flex items-center gap-2">
          <a href="#suporte" className="hidden px-3 text-sm font-semibold text-ink/70 hover:text-ink sm:inline">Suporte</a>
          <Link href="/login" className="btn-ghost btn-sm">Entrar</Link>
        </nav>
      </header>

      {/* hero */}
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-5 pb-16 pt-8 md:grid-cols-2 md:pt-14">
        <div>
          <span className="chip bg-brand-sun/40 text-ink">Cardápio digital + atendente com IA 24h</span>
          <h1 className="mt-4 font-display text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
            Seu delivery com <span className="text-brand">link próprio</span>, sem pagar comissão por pedido.
          </h1>
          <p className="mt-5 max-w-xl text-lg text-ink/70">
            Cardápio online, Pix automático, taxa de entrega por bairro ou km e painel de pedidos com aviso sonoro. E um <b className="text-ink">atendente com inteligência artificial no WhatsApp, 24 horas por dia, 7 dias por semana</b>.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link href={CTA} className="btn-primary text-lg">Criar minha loja</Link>
            <a href="#como-funciona" className="btn-ghost text-lg">Ver como funciona</a>
          </div>
          <p className="mt-3 text-sm text-ink/60">Sem cartão de crédito pra começar.</p>
        </div>

        {/* imagem principal */}
        <div className="relative mx-auto w-full max-w-xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/hero-app.webp" alt="Loja da Petti Pizzaria no Comanda, em dois celulares" className="block w-full" width={1400} height={933} fetchPriority="high" />
        </div>
      </section>

      {/* faixa de benefícios */}
      <section className="bg-ink text-cream">
        <div className="mx-auto grid max-w-6xl gap-6 px-5 py-8 text-center sm:grid-cols-2 lg:grid-cols-4">
          {[['0%', 'de comissão por pedido'], ['24/7', 'atendente com IA no WhatsApp'], ['Pix', 'confirmado automaticamente'], ['5 min', 'pra colocar a loja no ar']].map(([a, b]) => (
            <div key={a}>
              <p className="font-display text-4xl font-extrabold text-brand-sun">{a}</p>
              <p className="text-sm text-cream/70">{b}</p>
            </div>
          ))}
        </div>
      </section>

      {/* atendente IA */}
      <section className="mx-auto max-w-6xl px-5 py-16">
        <div className="grid items-center gap-8 rounded-3xl bg-white p-6 shadow-card sm:p-10 lg:grid-cols-2">
          <div>
            <span className="chip bg-brand-sun/40 text-ink">Novo</span>
            <h2 className="mt-3 font-display text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">Atendente com IA no WhatsApp, 24 horas por dia, 7 dias por semana</h2>
            <p className="mt-4 text-ink/70">Seu cliente chama no WhatsApp de madrugada, no domingo ou no horário de pico, e é atendido na hora. Sem fila, sem demora e sem pedido perdido.</p>
            <Link href={CTA} className="btn-primary mt-6 inline-flex">Quero o atendente na minha loja</Link>
          </div>
          <ul className="grid gap-3 text-sm">
            {[
              ['💬', 'Responde por texto e por áudio', 'Entende o que o cliente escreveu ou falou, como um atendente de verdade.'],
              ['🧾', 'Mostra o cardápio e anota o pedido', 'Calcula a taxa de entrega, confirma o resumo com o cliente e registra no painel.'],
              ['💠', 'Envia o Pix e acompanha o pagamento', 'O código do Pix chega no próprio WhatsApp e o pedido só entra no painel depois de pago.'],
              ['🙋', 'Chama você quando precisar', 'Você vê todas as conversas no painel, assume quando quiser e devolve ao robô depois.'],
            ].map(([i, t, d]) => (
              <li key={t} className="flex gap-3 rounded-2xl bg-cream p-4">
                <span className="text-2xl" aria-hidden="true">{i}</span>
                <span className="min-w-0"><b className="block">{t}</b><span className="break-words text-ink/70">{d}</span></span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* recursos */}
      <section className="mx-auto max-w-6xl px-5 py-16">
        <h2 className="text-center font-display text-3xl font-extrabold tracking-tight sm:text-4xl">Tudo que o seu delivery precisa</h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-ink/70">Feito pra quem vende por WhatsApp e quer parar de anotar pedido no braço.</p>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <div key={f.t} className="card min-w-0 p-5">
              <div className="text-3xl">{f.i}</div>
              <h3 className="mt-3 text-lg font-extrabold leading-tight">{f.t}</h3>
              <p className="mt-2 break-words text-sm text-ink/70">{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* como funciona */}
      <section id="como-funciona" className="bg-sand/50">
        <div className="mx-auto max-w-6xl px-5 py-16">
          <h2 className="text-center font-display text-3xl font-extrabold tracking-tight sm:text-4xl">Como funciona</h2>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.n} className="card p-6">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-brand font-display text-lg font-extrabold text-white">{s.n}</div>
                <h3 className="mt-4 text-xl font-extrabold">{s.t}</h3>
                <p className="mt-1 text-ink/70">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* suporte e treinamento */}
      <section id="suporte" className="mx-auto max-w-6xl px-5 py-16">
        <h2 className="text-center font-display text-3xl font-extrabold tracking-tight sm:text-4xl">Suporte e treinamento de equipe</h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-ink/70">Você não fica sozinho. Entregamos a loja funcionando e ensinamos sua equipe a usar.</p>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {SUPPORT.map((f) => (
            <div key={f.t} className="card min-w-0 p-5">
              <div className="text-3xl">{f.i}</div>
              <h3 className="mt-3 text-lg font-extrabold leading-tight">{f.t}</h3>
              <p className="mt-2 break-words text-sm text-ink/70">{f.d}</p>
            </div>
          ))}
        </div>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <a href="https://wa.me/5574999134241?text=Ol%C3%A1!%20Quero%20saber%20mais%20sobre%20o%20Comanda." className="btn-primary" target="_blank" rel="noreferrer">Falar no WhatsApp</a>
          <a href="/guia-comanda.pdf" download className="btn-ghost">📘 Baixar o passo a passo (PDF)</a>
          <a href="mailto:comandagrupobridge@gmail.com" className="btn-ghost">comandagrupobridge@gmail.com</a>
        </div>
      </section>

      {/* faq */}
      <section className="mx-auto max-w-3xl px-5 py-16">
        <h2 className="text-center font-display text-3xl font-extrabold tracking-tight sm:text-4xl">Perguntas frequentes</h2>
        <div className="mt-8 space-y-3">
          {FAQ.map((f) => (
            <details key={f.q} className="card group p-4">
              <summary className="cursor-pointer list-none font-bold marker:hidden">
                <span className="mr-2 text-brand">＋</span>{f.q}
              </summary>
              <p className="mt-2 text-ink/70">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* cta final */}
      <section className="mx-auto max-w-4xl px-5 pb-16">
        <div className="rounded-3xl bg-gradient-to-br from-brand to-brand-dark p-8 text-center text-white shadow-card sm:p-12">
          <h2 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">Pronto pra vender sem intermediário?</h2>
          <p className="mx-auto mt-3 max-w-xl text-white/85">Crie sua loja agora e receba o primeiro pedido pelo seu próprio link.</p>
          <Link href={CTA} className="btn-sun mt-6 text-lg">Criar minha loja</Link>
        </div>
      </section>

      <footer className="border-t border-sand py-8 text-center text-sm text-ink/60">
        <p>© {new Date().getFullYear()} Comanda · um produto <strong>Grupo Bridge</strong></p>
        <p className="mt-1"><Link href="/login" className="underline">Entrar no painel</Link></p>
      </footer>
    </main>
  );
}
