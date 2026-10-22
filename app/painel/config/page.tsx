import { getContext } from '@/lib/panel';
import ConfigForm from '@/components/painel/ConfigForm';

export default async function ConfigPage() {
  const { current } = await getContext();
  return <ConfigForm businessId={current!.business_id} canEdit={['owner', 'manager'].includes(current!.role)} />;
}
