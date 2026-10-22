import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { supabaseAnon } from '@/lib/supabase/anon';
import Store from '@/components/Store';
import type { Business, Category, Group, Product, Zone } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

async function load(slug: string) {
  const db = supabaseAnon();
  const { data: biz } = await db
    .from('businesses')
    .select(
      'id,slug,name,description,logo_url,banner_url,whatsapp_contact,address_text,accepts_delivery,accepts_pickup,min_order,prep_time_min'
    )
    .eq('slug', slug.toLowerCase())
    .maybeSingle();
  if (!biz) return null;

  const [cats, prods, groups, opts, zones, open] = await Promise.all([
    db.from('categories').select('id,name,sort_order').eq('business_id', biz.id).order('sort_order').order('name'),
    db
      .from('products')
      .select('id,category_id,name,description,base_price,photo_url,sort_order')
      .eq('business_id', biz.id)
      .eq('is_available', true)
      .order('sort_order')
      .order('name'),
    db.from('product_option_groups').select('id,product_id,name,min_select,max_select,sort_order').eq('business_id', biz.id).order('sort_order'),
    db.from('product_options').select('id,group_id,name,price_delta,sort_order').eq('business_id', biz.id).eq('is_available', true).order('sort_order'),
    db.from('delivery_zones').select('id,name,fee,min_order,eta_min').eq('business_id', biz.id).order('name'),
    db.rpc('is_business_open', { p_business: biz.id }),
  ]);

  const groupList = (groups.data ?? []) as any[];
  const optList = (opts.data ?? []) as any[];
  const products: Product[] = ((prods.data ?? []) as any[]).map((p) => ({
    ...p,
    base_price: Number(p.base_price),
    groups: groupList
      .filter((g) => g.product_id === p.id)
      .map(
        (g): Group => ({
          id: g.id,
          name: g.name,
          min_select: g.min_select,
          max_select: g.max_select,
          sort_order: g.sort_order,
          options: optList
            .filter((o) => o.group_id === g.id)
            .map((o) => ({ id: o.id, name: o.name, price_delta: Number(o.price_delta), sort_order: o.sort_order })),
        })
      )
      .filter((g) => g.options.length > 0),
  }));

  return {
    business: { ...biz, min_order: Number(biz.min_order) } as Business,
    categories: (cats.data ?? []) as Category[],
    products,
    zones: ((zones.data ?? []) as any[]).map((z) => ({ ...z, fee: Number(z.fee), min_order: Number(z.min_order) })) as Zone[],
    isOpen: open.data === true,
  };
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const data = await load(params.slug);
  if (!data) return { title: 'Loja não encontrada' };
  return { title: data.business.name, description: data.business.description ?? `Faça seu pedido em ${data.business.name}` };
}

export default async function StorePage({ params }: { params: { slug: string } }) {
  const data = await load(params.slug);
  if (!data) notFound();
  return <Store {...data} />;
}
