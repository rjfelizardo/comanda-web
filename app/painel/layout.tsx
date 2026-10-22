import Link from 'next/link';
import { getContext } from '@/lib/panel';
import PanelNav from '@/components/painel/PanelNav';
import Onboarding from '@/components/painel/Onboarding';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Painel' };

export default async function PainelLayout({ children }: { children: React.ReactNode }) {
  const { list, current, user } = await getContext();

  if (!current) {
    return (
      <main className="mx-auto min-h-screen max-w-md px-6 py-10">
        <Onboarding email={user.email ?? ''} />
      </main>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-sand bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
          <Link href="/painel" className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={current.logo_url || '/logo.png'} alt={current.name} width={32} height={32} className="h-8 w-8 rounded-lg object-cover" />
          </Link>
          <PanelNav list={list} currentId={current.business_id} slug={current.slug} />
        </div>
      </header>
      <div className="mx-auto max-w-5xl px-4 py-5">{children}</div>
    </div>
  );
}
