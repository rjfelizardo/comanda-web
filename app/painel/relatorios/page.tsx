import { getContext } from '@/lib/panel';
import Reports from '@/components/painel/Reports';

export default async function RelatoriosPage() {
  const { current } = await getContext();
  return <Reports businessId={current!.business_id} />;
}
