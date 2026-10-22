import { getContext } from '@/lib/panel';
import CatalogManager from '@/components/painel/CatalogManager';

export default async function CardapioPage() {
  const { current } = await getContext();
  return <CatalogManager businessId={current!.business_id} canEdit={['owner', 'manager'].includes(current!.role)} />;
}
