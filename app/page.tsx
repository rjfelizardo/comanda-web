import Link from 'next/link';

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-6 px-6 text-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo.png" alt="Comanda" width={120} height={120} className="drop-shadow-lg" />
      <div>
        <h1 className="text-4xl font-extrabold tracking-tight">Comanda</h1>
        <p className="mt-2 text-ink/70">Seu cardápio, seus pedidos e seu atendimento no WhatsApp, em um só lugar.</p>
      </div>
      <div className="flex w-full flex-col gap-3">
        <Link href="/login?modo=cadastro" className="btn-primary">Criar minha loja</Link>
        <Link href="/login" className="btn-ghost">Já tenho conta</Link>
      </div>
    </main>
  );
}
