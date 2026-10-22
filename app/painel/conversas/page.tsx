import { getContext } from '@/lib/panel';
import ConversationsBoard from '@/components/painel/ConversationsBoard';

export const dynamic = 'force-dynamic';

export default async function ConversasPage() {
  const { current } = await getContext();
  return <ConversationsBoard businessId={current!.business_id} />;
}
