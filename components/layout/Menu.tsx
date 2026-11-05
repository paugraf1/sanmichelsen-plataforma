'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon } from '../ui/Icon';
import { MENU } from './menu-datos';



const activo = (path: string, href: string) => path === href || path.startsWith(href + '/');

export function NavLateral({ pendientesModulos }: { pendientesModulos?: number }) {
  const path = usePathname();
  return (
    <nav className="nav" aria-label="Principal">
      {MENU.map((m) => (
        <Link key={m.href} href={m.href} aria-current={activo(path, m.href) ? 'page' : undefined}>
          <span><Icon name={m.icon} />{m.label}</span>
          {m.href === '/programa' && pendientesModulos ? <span className="cnt">{pendientesModulos}</span> : null}
        </Link>
      ))}
    </nav>
  );
}

export function NavMovil() {
  const path = usePathname();
  const otros = !MENU.filter((m) => m.movil).some((m) => activo(path, m.href));
  return (
    <nav className="bnav" aria-label="Principal en celular">
      {MENU.filter((m) => m.movil).map((m) => (
        <Link key={m.href} href={m.href} aria-current={activo(path, m.href) ? 'page' : undefined}><Icon name={m.icon} size={20} />{m.corto}</Link>
      ))}
      <Link href="/mas" aria-current={otros ? 'page' : undefined}><Icon name="menu" size={20} />Más</Link>
    </nav>
  );
}
