import LojaFicha from '@/components/admin/LojaFicha';
export default function AdminLoja({ params }: { params: { id: string } }) { return <LojaFicha id={params.id} />; }
