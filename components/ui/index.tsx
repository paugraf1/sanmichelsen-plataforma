import Link from 'next/link';
import type { ReactNode } from 'react';
import { Icon, type IconName } from './Icon';

export { Icon };

export function Bar({ value, label }: { value: number; label?: string }) {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className="bar" role="progressbar" aria-valuenow={v} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <span style={{ width: `${v}%` }} />
    </div>
  );
}

export type Tone = 'ok' | 'warn' | 'bad' | 'dk' | 'cream' | undefined;
export function Tag({ children, tone }: { children: ReactNode; tone?: Tone }) {
  return <span className={`tag${tone ? ' ' + tone : ''}`}>{children}</span>;
}

export function Avatar({ initials, dark, large }: { initials: string; dark?: boolean; large?: boolean }) {
  return <span className={`av${dark ? ' dk' : ''}${large ? ' lg' : ''}`} aria-hidden="true">{initials}</span>;
}

export function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('') || '·';
}

export function PageHead({ eyebrow, title, lead, actions }: { eyebrow: string; title: ReactNode; lead?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="top">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h1 className="t">{title}</h1>
        {lead ? <p className="lead">{lead}</p> : null}
      </div>
      {actions ? <div className="acts">{actions}</div> : null}
    </div>
  );
}

type BtnKind = '' | 'o' | 'l';
export function LinkBtn({ href, children, kind = '', small, icon, external }: {
  href: string; children: ReactNode; kind?: BtnKind; small?: boolean; icon?: IconName; external?: boolean;
}) {
  const cls = `btn${kind ? ' ' + kind : ''}${small ? ' s' : ''}`;
  const inner = <>{children}{icon ? <Icon name={icon} size={16} /> : null}</>;
  if (external) return <a className={cls} href={href} target="_blank" rel="noopener noreferrer">{inner}</a>;
  return <Link className={cls} href={href}>{inner}</Link>;
}

export function Stat({ label, value }: { label: string; value: ReactNode }) {
  return <div className="card"><span className="mut sm">{label}</span><span className="n">{value}</span></div>;
}

export function Tabs({ items, current, base }: { items: { key: string; label: string; num?: string }[]; current: string; base: string }) {
  return (
    <nav className="chips tabs" aria-label="Secciones">
      {items.map((t) => (
        <Link key={t.key} href={`${base}?paso=${t.key}`} className={`chip${t.key === current ? ' on' : ''}`} aria-current={t.key === current ? 'page' : undefined}>
          {t.num ? <span className="num">{t.num}</span> : null}{t.label}
        </Link>
      ))}
    </nav>
  );
}
