import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { supabaseServer } from '@/lib/supabase/server';

export type Membership = { business_id: string; role: string; name: string; slug: string };

export async function getContext() {
  const supabase = supabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect('/login');

  const { data: members } = await supabase.from('business_members').select('business_id,role').eq('user_id', auth.user.id);
  const ids = (members ?? []).map((m: any) => m.business_id);
  let businesses: any[] = [];
  if (ids.length) {
    const { data } = await supabase.from('businesses').select('id,name,slug').in('id', ids);
    businesses = data ?? [];
  }
  const list: Membership[] = (members ?? [])
    .map((m: any) => {
      const b = businesses.find((x) => x.id === m.business_id);
      return b ? { business_id: m.business_id, role: m.role, name: b.name, slug: b.slug } : null;
    })
    .filter(Boolean) as Membership[];

  const wanted = cookies().get('comanda-biz')?.value;
  const current = list.find((b) => b.business_id === wanted) ?? list[0] ?? null;
  return { supabase, user: auth.user, list, current };
}
