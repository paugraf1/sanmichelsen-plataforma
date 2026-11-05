import Link from 'next/link';
import { redirect } from 'next/navigation';
import { PanelAcceso } from '@/components/layout/PanelAcceso';
import { Enviar, FormAccion } from '@/components/ui/cliente';
import { completarPrimerIngreso } from '@/lib/acciones';
import { MODO_DEMO } from '@/lib/config';
import { getYo } from '@/lib/data/participante';
import { supabaseServidor } from '@/lib/supabase/server';

export const metadata = { title: 'Bienvenida' };
export const dynamic = 'force-dynamic';

export default async function PrimerIngreso() {
  const yo = await getYo();
  if (yo.primerIngresoHecho && !MODO_DEMO) redirect('/inicio');
  let necesitaContrasena = true;
  if (!MODO_DEMO) {
    const sb = await supabaseServidor();
    const { data } = await sb.auth.getUser();
    necesitaContrasena = (data.user?.app_metadata?.provider ?? 'email') === 'email';
  }
  return (
    <PanelAcceso>
      <div><span className="eyebrow">Primer ingreso</span><h2 className="t" style={{ fontSize: 40 }}>Hola, <i>{yo.nombre.split(' ')[0] || 'bienvenida'}.</i></h2><p className="mut" style={{ margin: '6px 0 0' }}>Antes de empezar, crea tu contraseña y revisa cómo cuidamos tu información.</p></div>
      <FormAccion accion={completarPrimerIngreso} className="stack">
        <input type="hidden" name="necesita_contrasena" value={necesitaContrasena ? '1' : '0'} />
        {necesitaContrasena ? (
          <>
            <label className="fl">Crea tu contraseña<input className="in" type="password" name="contrasena" autoComplete="new-password" minLength={8} required /></label>
            <label className="fl">Repítela<input className="in" type="password" name="contrasena2" autoComplete="new-password" minLength={8} required /></label>
          </>
        ) : null}
        <label className="check"><input type="checkbox" name="privacidad" required /><span>Leí y acepto el <Link href="/legal/privacidad" target="_blank">aviso de privacidad</Link>.</span></label>
        <label className="check"><input type="checkbox" name="terminos" required /><span>Acepto los <Link href="/legal/terminos" target="_blank">términos y condiciones</Link> del programa.</span></label>
        <label className="check"><input type="checkbox" name="compartir" required /><span>Acepto que compartan mi perfil profesional con headhunters y contactos clave de mis empresas meta. Nunca mi sueldo ni mi teléfono sin preguntarme.</span></label>
        <Enviar className="btn blk">Entrar a mi programa</Enviar>
      </FormAccion>
    </PanelAcceso>
  );
}
