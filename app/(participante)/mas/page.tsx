import Link from 'next/link';
import { Icon, PageHead } from '@/components/ui';
import { MENU } from '@/components/layout/menu-datos';
import { salir } from '@/lib/acciones';
export const metadata = { title: 'Más' };
export default function Mas() {
  return (
    <>
      <PageHead eyebrow="Menú" title={<>Todo <i>tu programa.</i></>} />
      <div className="card w">
        <div className="list">
          {MENU.map((m) => <Link key={m.href} href={m.href} className="row sb" style={{ textDecoration: 'none' }}><span className="row"><Icon name={m.icon} />{m.label}</span><Icon name="arrow" size={16} /></Link>)}
          <form action={salir}><button type="submit" className="row" style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer', width: '100%' }}><Icon name="logout" />Cerrar sesión</button></form>
        </div>
      </div>
    </>
  );
}
