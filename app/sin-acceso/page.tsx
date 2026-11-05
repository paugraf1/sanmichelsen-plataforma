import Link from 'next/link';
import { PanelAcceso } from '@/components/layout/PanelAcceso';
export const metadata = { title: 'Sin acceso' };
export default function SinAcceso() {
  return <PanelAcceso><h2 className="t" style={{ fontSize: 38, marginTop: 0 }}>Este panel es para <i>participantes.</i></h2><p className="mut" style={{ margin: 0 }}>Los paneles de consultor, operaciones, admin y empresa se suman en la siguiente etapa.</p><Link className="btn o" href="/login">Volver</Link></PanelAcceso>;
}
