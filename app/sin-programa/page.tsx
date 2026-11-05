import { PanelAcceso } from '@/components/layout/PanelAcceso';
import { salir } from '@/lib/acciones';
export const metadata = { title: 'Sin programa activo' };
export default function SinPrograma() {
  return <PanelAcceso><h2 className="t" style={{ fontSize: 38, marginTop: 0 }}>Aún no tienes un <i>programa activo.</i></h2><p className="mut" style={{ margin: 0 }}>Si ya compraste tu programa, en unos minutos te damos de alta. Escríbenos a hola@sanmichelsen.com si tienes dudas.</p><form action={salir}><button type="submit" className="btn o">Cerrar sesión</button></form></PanelAcceso>;
}
