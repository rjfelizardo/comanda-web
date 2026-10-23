'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/client';

const ITEMS = [
  { href: '/admin', label: 'Lojistas', icon: '🏪' },
  { href: '/admin/financeiro', label: 'Financeiro', icon: '💰' },
];

export default function AdminNav({ email }: { email: string }) {
  const path = usePathname();
  const router = useRouter();
  const on = (h: string) => (h === '/admin' ? path === '/admin' || path.startsWith('/admin/lojas') : path.startsWith(h));
  async function logout() {
    await supabaseBrowser().auth.signOut();
    router.replace('/login');
    router.refresh();
  }
  return (
    <aside className="border-b border-sand bg-white md:sticky md:top-0 md:h-screen md:w-60 md:shrink-0 md:border-b-0 md:border-r">
      <div className="flex items-center gap-2 px-4 py-3 md:py-5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="" width={32} height={32} className="h-8 w-8 rounded-lg object-cover" />
        <div className="min-w-0">
          <p className="font-extrabold leading-tight">Comanda</p>
          <p className="text-xs text-ink/50">Administração</p>
        </div>
      </div>
      <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:overflow-visible md:pb-0">
        {ITEMS.map((i) => (
          <Link key={i.href} href={i.href} className={`flex items-center gap-2 whitespace-nowrap rounded-xl px-3 py-2.5 text-sm font-semibold ${on(i.href) ? 'bg-brand text-white' : 'text-ink/70 hover:bg-sand'}`}>
            <span aria-hidden="true">{i.icon}</span>{i.label}
          </Link>
        ))}
      </nav>
      <div className="hidden px-4 pt-6 text-sm md:block">
        <p className="break-all text-xs text-ink/50">{email}</p>
        <button onClick={logout} className="mt-2 text-ink/60 underline">Sair</button>
      </div>
    </aside>
  );
}
