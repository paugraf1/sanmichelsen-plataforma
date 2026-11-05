import Link from 'next/link';
import { PanelAcceso } from '@/components/layout/PanelAcceso';
import { Enviar, FormAccion } from '@/components/ui/cliente';
import { entrarConCorreo, entrarConGoogle, entrarConLinkedIn } from '@/lib/acciones';
import { MODO_DEMO } from '@/lib/config';

export const metadata = { title: 'Iniciar sesión' };

export default async function Login({ searchParams }: { searchParams: Promise<{ volver?: string; error?: string }> }) {
  const { volver = '/inicio', error } = await searchParams;
  return (
    <PanelAcceso>
      <div>
        <h2 className="t" style={{ fontSize: 40, marginTop: 0 }}>Inicia sesión</h2>
        <p className="mut" style={{ margin: '6px 0 0' }}>Entra con el correo con el que te dimos de alta.</p>
      </div>
      {MODO_DEMO ? <div className="callout"><span className="sm"><b style={{ fontWeight: 600 }}>Modo demo:</b> cualquier botón te lleva a la plataforma de Mariana Ríos.</span></div> : null}
      {error ? <p className="err">No pudimos entrar con ese proveedor. Intenta de nuevo o usa tu correo.</p> : null}
      <div className="stack">
        <form action={entrarConGoogle}><button type="submit" className="btn o blk">Continuar con Google</button></form>
        <form action={entrarConLinkedIn}><button type="submit" className="btn o blk">Continuar con LinkedIn</button></form>
      </div>
      <div className="or">o con tu correo</div>
      <FormAccion accion={entrarConCorreo} className="stack">
        <input type="hidden" name="volver" value={volver} />
        <label className="fl">Correo<input className="in" type="email" name="correo" autoComplete="email" required={!MODO_DEMO} /></label>
        <label className="fl">Contraseña<input className="in" type="password" name="contrasena" autoComplete="current-password" required={!MODO_DEMO} /></label>
        <Enviar className="btn blk">Entrar</Enviar>
      </FormAccion>
      <Link href="/recuperar" className="sm" style={{ alignSelf: 'center' }}>Olvidé mi contraseña</Link>
    </PanelAcceso>
  );
}
