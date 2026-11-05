import Link from 'next/link';
import { PanelAcceso } from '@/components/layout/PanelAcceso';
import { Enviar, FormAccion } from '@/components/ui/cliente';
import { recuperarContrasena } from '@/lib/acciones';

export const metadata = { title: 'Recuperar contraseña' };

export default function Recuperar() {
  return (
    <PanelAcceso>
      <div><h2 className="t" style={{ fontSize: 40, marginTop: 0 }}>Recupera tu acceso</h2><p className="mut" style={{ margin: '6px 0 0' }}>Te mandamos un enlace para crear una contraseña nueva.</p></div>
      <FormAccion accion={recuperarContrasena} className="stack">
        <label className="fl">Correo<input className="in" type="email" name="correo" autoComplete="email" required /></label>
        <Enviar className="btn blk">Enviar enlace</Enviar>
      </FormAccion>
      <Link href="/login" className="sm" style={{ alignSelf: 'center' }}>Volver a iniciar sesión</Link>
    </PanelAcceso>
  );
}
