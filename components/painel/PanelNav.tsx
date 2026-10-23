'use client';
import { storeUrl } from '@/lib/storeUrl';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/client';

type M = { business_id: string; name: string; slug: string };

export default function PanelNav({ list, currentId, slug }: { list: M[]; currentId: string; slug: string }) {
  const path = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  useEffect(() => { setOpen(false); }, [path]);

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
    { href: '/painel/conversas', label: 'Conversas' },
    { href: '/painel/cardapio', label: 'Cardápio' },
    { href: '/painel/cupons', label: 'Cupons' },
    { href: '/painel/relatorios', label: 'Relatórios' },
    { href: '/painel/config', label: 'Configurações' },
  ];

  const bizSelect = list.length > 1 ? (
    <select className="min-w-0 max-w-[10rem] truncate rounded-lg border border-sand bg-white px-2 py-1 text-sm font-semibold" value={currentId} onChange={(e) => switchBiz(e.target.value)}>
      {list.map((b) => <option key={b.business_id} value={b.business_id}>{b.name}</option>)}
    </select>
  ) : (
    <span className="min-w-0 max-w-[10rem] truncate text-sm font-bold">{list[0]?.name}</span>
  );
  const isOn = (href: string) => (href === '/painel' ? path === '/painel' : path.startsWith(href));

  return (
    <>
      {/* celular: nome + menu sanduíche */}
      <div className="flex min-w-0 flex-1 items-center justify-between gap-3 md:hidden">
        {bizSelect}
        <button
          type="button"
          aria-label={open ? 'Fechar menu' : 'Abrir menu'}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-sand bg-white"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
            {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
        {open && (
          <>
            <button type="button" aria-label="Fechar menu" className="fixed inset-0 top-[57px] z-30 bg-black/30" onClick={() => setOpen(false)} />
            <nav className="absolute inset-x-0 top-full z-40 border-b border-sand bg-white px-4 py-3 shadow-lg">
              <div className="flex flex-col gap-1">
                {tabs.map((t) => (
                  <Link key={t.href} href={t.href} onClick={() => setOpen(false)} className={`rounded-xl px-4 py-3 text-base font-semibold ${isOn(t.href) ? 'bg-brand text-white' : 'text-ink hover:bg-sand'}`}>
                    {t.label}
                  </Link>
                ))}
              </div>
              <div className="mt-2 flex items-center justify-between border-t border-sand px-4 pt-3 text-base">
                <a href={storeUrl(slug)} target="_blank" rel="noreferrer" className="font-semibold text-brand-dark underline">Ver loja</a>
                <button onClick={logout} className="text-ink/60 underline">Sair</button>
              </div>
            </nav>
          </>
        )}
      </div>

      {/* tablet e computador */}
      <div className="hidden min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-2 md:flex">
        {bizSelect}
        <nav className="flex flex-1 gap-1 overflow-x-auto text-sm font-semibold">
          {tabs.map((t) => (
            <Link key={t.href} href={t.href} className={`whitespace-nowrap rounded-full px-3 py-1.5 ${isOn(t.href) ? 'bg-brand text-white' : 'text-ink/70 hover:bg-sand'}`}>
              {t.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2 text-sm">
          <a href={storeUrl(slug)} target="_blank" rel="noreferrer" className="font-semibold text-brand-dark underline">Ver loja</a>
          <button onClick={logout} className="text-ink/60 underline">Sair</button>
        </div>
      </div>
    </>
  );
}
