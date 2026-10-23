import Link from 'next/link';
import { redirect } from 'next/navigation';
import { supabaseServer } from '@/lib/supabase/server';
import AdminBoard from '@/components/admin/AdminBoard';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Admin' };

export default async function AdminPage() {
  const supabase = supabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect('/login');
  const { data: isAdmin } = await supabase.rpc('is_platform_admin');
  if (isAdmin !== true) redirect('/painel');

  return (
    <div className="min-h-screen overflow-x-hidden">
      <header className="sticky top-0 z-30 border-b border-sand bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="" width={32} height={32} className="h-8 w-8 rounded-lg object-cover" />
            <span className="truncate font-extrabold">Comanda Admin</span>
          </div>
          <Link href="/painel" className="shrink-0 text-sm font-semibold text-brand-dark underline">Meu painel</Link>
        </div>
      </header>
      <div className="mx-auto min-w-0 max-w-6xl px-4 py-5">
        <AdminBoard />
      </div>
    </div>
  );
}
