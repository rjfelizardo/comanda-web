import { redirect } from 'next/navigation';
import { supabaseServer } from '@/lib/supabase/server';
import AdminNav from '@/components/admin/AdminNav';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Admin' };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = supabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect('/login');
  const { data: isAdmin } = await supabase.rpc('is_platform_admin');
  if (isAdmin !== true) redirect('/painel');

  return (
    <div className="min-h-screen overflow-x-hidden md:flex">
      <AdminNav email={auth.user.email ?? ''} />
      <main className="min-w-0 flex-1 px-4 py-5 md:px-8 md:py-8">{children}</main>
    </div>
  );
}
