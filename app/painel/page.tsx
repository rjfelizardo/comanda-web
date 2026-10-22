import { getContext } from '@/lib/panel';
import OrdersBoard from '@/components/painel/OrdersBoard';

export default async function PedidosPage() {
  const { current } = await getContext();
  return <OrdersBoard businessId={current!.business_id} businessName={current!.name} />;
}
