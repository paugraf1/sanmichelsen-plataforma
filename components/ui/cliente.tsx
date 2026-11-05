'use client';
import { createContext, useActionState, useCallback, useContext, useEffect, useRef, useState, useTransition, type ReactNode } from 'react';
import type { Resultado } from '@/lib/acciones';
import { Icon } from './Icon';

/* ---------- Avisos ---------- */
const Ctx = createContext<(r: Resultado | string) => void>(() => {});
export function useAviso() { return useContext(Ctx); }

export function Avisos({ children }: { children: ReactNode }) {
  const [aviso, setAviso] = useState<{ t: string; malo: boolean } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mostrar = useCallback((r: Resultado | string) => {
    const a = typeof r === 'string' ? { t: r, malo: false } : r.ok ? (r.mensaje ? { t: r.mensaje, malo: false } : null) : { t: r.error, malo: true };
    if (!a) return;
    setAviso(a);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setAviso(null), 3200);
  }, []);
  return (
    <Ctx.Provider value={mostrar}>
      {children}
      <div aria-live="polite" role="status">
        {aviso ? <div className={`toast${aviso.malo ? ' bad' : ''}`}><Icon name={aviso.malo ? 'x' : 'ok'} size={16} />{aviso.t}</div> : null}
      </div>
    </Ctx.Provider>
  );
}

/* ---------- Botón que ejecuta una acción del servidor ---------- */
export function BotonAccion({ accion, children, className = 'btn', disabled, confirmar }: {
  accion: () => Promise<Resultado>; children: ReactNode; className?: string; disabled?: boolean; confirmar?: string;
}) {
  const [pendiente, start] = useTransition();
  const avisar = useAviso();
  return (
    <button type="button" className={className} disabled={disabled || pendiente} aria-busy={pendiente}
      onClick={() => { if (confirmar && !window.confirm(confirmar)) return; start(async () => avisar(await accion())); }}>
      {children}
    </button>
  );
}

/* ---------- Formulario con acción del servidor ---------- */
const CerrarCtx = createContext<(() => void) | null>(null);

export function FormAccion({ accion, children, className, limpiar }: {
  accion: (prev: Resultado | null, f: FormData) => Promise<Resultado>; children: ReactNode; className?: string; limpiar?: boolean;
}) {
  const [estado, enviar, pendiente] = useActionState(accion, null);
  const avisar = useAviso();
  const cerrarVentana = useContext(CerrarCtx);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (!estado) return;
    avisar(estado);
    if (estado.ok) { if (limpiar) ref.current?.reset(); cerrarVentana?.(); }
  }, [estado]); // eslint-disable-line react-hooks/exhaustive-deps
  return <form ref={ref} action={enviar} className={className} aria-busy={pendiente}>{children}</form>;
}

/* ---------- Ventana ---------- */
export function Ventana({ abierta, cerrar, titulo, eyebrow, children }: { abierta: boolean; cerrar: () => void; titulo: string; eyebrow?: string; children: ReactNode }) {
  useEffect(() => {
    if (!abierta) return;
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') cerrar(); };
    document.addEventListener('keydown', k); document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', k); document.body.style.overflow = ''; };
  }, [abierta, cerrar]);
  if (!abierta) return null;
  return (
    <div className="ovl" onClick={(e) => { if (e.target === e.currentTarget) cerrar(); }}>
      <div className="mdl" role="dialog" aria-modal="true" aria-label={titulo}>
        <div className="row sb">
          {eyebrow ? <span className="eyebrow">{eyebrow}</span> : <span />}
          <button type="button" className="x" onClick={cerrar} aria-label="Cerrar"><Icon name="x" /></button>
        </div>
        <h2 className="hs" style={{ fontSize: 30 }}>{titulo}</h2>
        {children}
      </div>
    </div>
  );
}

/** Botón que abre una ventana. Un FormAccion adentro la cierra solo al guardar bien. */
export function BotonVentana({ etiqueta, className = 'btn', icono, titulo, eyebrow, children }: {
  etiqueta: ReactNode; className?: string; icono?: Parameters<typeof Icon>[0]['name']; titulo: string; eyebrow?: string; children: ReactNode;
}) {
  const [abierta, setAbierta] = useState(false);
  const cerrar = useCallback(() => setAbierta(false), []);
  return (
    <>
      <button type="button" className={className} onClick={() => setAbierta(true)}>{icono ? <Icon name={icono} size={16} /> : null}{etiqueta}</button>
      <Ventana abierta={abierta} cerrar={cerrar} titulo={titulo} eyebrow={eyebrow}><CerrarCtx.Provider value={cerrar}>{children}</CerrarCtx.Provider></Ventana>
    </>
  );
}

export function Enviar({ children, className = 'btn', name, value }: { children: ReactNode; className?: string; name?: string; value?: string }) {
  return <button type="submit" className={className} name={name} value={value}>{children}</button>;
}
