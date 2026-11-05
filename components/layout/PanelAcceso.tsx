/* eslint-disable @next/next/no-img-element */
import type { ReactNode } from 'react';

export function PanelAcceso({ children }: { children: ReactNode }) {
  return (
    <div className="login">
      <div className="pan">
        <a href="https://sanmichelsen.com"><img src="/logo-sandra-claro.png" alt="Sandra Michelsen · Executive Reinvention" style={{ width: 200 }} /></a>
        <div>
          <span className="eyebrow">Executive Transition Academy</span>
          <h1 className="t" style={{ fontSize: 54 }}>Tu siguiente etapa <i>empieza aquí.</i></h1>
        </div>
        <span className="ally">En alianza con <img src="/wewow-blanco.png" alt="We Wow" /></span>
      </div>
      <div className="frm"><div className="box">{children}</div></div>
    </div>
  );
}
