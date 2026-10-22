'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/client';

type M = { business_id: string; name: string; slug: string };

export default function PanelNav({ list, currentId, slug }: { list: M[]; currentId: string; slug: string }) {
  const path = usePathname();
  const router = useRouter();

  function switchBiz(id: string) {
    document.cookie = `comanda-biz=${id}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  }

  async function logout() {
    await supabaseBrowser().auth.signOut();
    router.replace('/login');
    router.refresh();
  }

  const tabs = [
    { href: '/painel', label: 'Pedidos' },
    { href: '/painel/cardapio', label: 'Cardápio' },
    { href: '/painel/config', label: 'Configurações' },
  ];

  return (
    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-2">
      {list.length > 1 ? (
        <select className="max-w-[10rem] truncate rounded-lg border border-sand bg-white px-2 py-1 text-sm font-semibold" value={currentId} onChange={(e) => switchBiz(e.target.value)}>
          {list.map((b) => <option key={b.business_id} value={b.business_id}>{b.name}</option>)}
        </select>
      ) : (
        <span className="max-w-[10rem] truncate text-sm font-bold">{list[0]?.name}</span>
      )}
      <nav className="flex flex-1 gap-1 overflow-x-auto text-sm font-semibold">
        {tabs.map((t) => {
          const on = t.href === '/painel' ? path === '/painel' : path.startsWith(t.href);
          return (
            <Link key={t.href} href={t.href} className={`whitespace-nowrap rounded-full px-3 py-1.5 ${on ? 'bg-brand text-white' : 'text-ink/70 hover:bg-sand'}`}>
              {t.label}
            </Link>
          );
        })}
      </nav>
      <div className="flex items-center gap-2 text-sm">
        <a href={`/${slug}`} target="_blank" rel="noreferrer" className="font-semibold text-brand-dark underline">Ver loja</a>
        <button onClick={logout} className="text-ink/60 underline">Sair</button>
      </div>
    </div>
  );
}
