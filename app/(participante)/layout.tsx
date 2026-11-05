import Link from 'next/link';
import { NavLateral, NavMovil } from '@/components/layout/Menu';
import { Avatar, Bar, Icon, initials } from '@/components/ui';
import { salir } from '@/lib/acciones';
import { getModulos, requiereParticipante } from '@/lib/data/participante';

export const dynamic = 'force-dynamic';

export default async function LayoutParticipante({ children }: { children: React.ReactNode }) {
  const yo = await requiereParticipante();
  const mods = await getModulos();
  const hechos = mods.filter((m) => m.estado === 'completado').length;
  const pct = Math.round((hechos / 13) * 100);
  const vence = yo.inscripcion.vence ? new Date(yo.inscripcion.vence + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }) : null;
  return (
    <div className="shell">
      <aside className="side" aria-label="Menú">
        <div className="side-in">
          <Link href="/inicio" className="logo" aria-label="Inicio">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-sandra.png" alt="Sandra Michelsen · Executive Reinvention" width={170} height={40} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <span className="ally">En alianza con <img src="/wewow-gris.png" alt="We Wow" /></span>
          </Link>
          <div className="prog">
            <div className="row sb"><span>Tu avance</span><b>{pct}%</b></div>
            <Bar value={pct} label="Tu avance" />
            {vence ? <span className="mut">Vigencia hasta el {vence}</span> : null}
          </div>
          <NavLateral pendientesModulos={13 - hechos} />
          <div className="me">
            <Avatar initials={initials(yo.nombre)} />
            <div style={{ minWidth: 0 }}><b>{yo.nombre}</b><small>Programa {yo.inscripcion.programa}</small></div>
            <form action={salir}><button type="submit" className="x btn o s" aria-label="Cerrar sesión" title="Cerrar sesión" style={{ width: 40, padding: 0 }}><Icon name="logout" size={16} /></button></form>
          </div>
        </div>
      </aside>
      <main className="main" id="contenido">
        <div className="mtop">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <Link href="/inicio" aria-label="Inicio"><img src="/logo-sandra.png" alt="Sandra Michelsen" /></Link>
          <Link href="/mas" className="btn o s" aria-label="Más opciones"><Icon name="menu" size={16} /></Link>
        </div>
        {children}
      </main>
      <NavMovil />
    </div>
  );
}
