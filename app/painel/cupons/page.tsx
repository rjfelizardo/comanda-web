import { getContext } from '@/lib/panel';
import Coupons from '@/components/painel/Coupons';

export default async function CuponsPage() {
  const { current } = await getContext();
  return <Coupons businessId={current!.business_id} canEdit={['owner', 'manager'].includes(current!.role)} />;
}
