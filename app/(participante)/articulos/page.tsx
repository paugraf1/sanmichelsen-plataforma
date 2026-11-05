import { Icon, PageHead } from '@/components/ui';
import { getArticulos } from '@/lib/data/participante';

export const metadata = { title: 'Artículos' };

export default async function Articulos() {
  const lista = await getArticulos();
  return (
    <>
      <PageHead eyebrow="Artículos" title={<>Lecturas <i>de Sandra.</i></>} lead="Artículos de interés para tu transición, publicados en LinkedIn." />
      <div className="grid g3">
        {lista.map((a) => (
          <a key={a.id} className="card w" href={a.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
            <span className="mut xs">{new Date(a.fecha + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
            <h2 className="hs" style={{ fontSize: 24 }}>{a.titulo}</h2>
            <p className="mut sm" style={{ margin: 0 }}>{a.resumen}</p>
            <span className="row sm" style={{ marginTop: 'auto' }}>Leer en LinkedIn <Icon name="arrow" size={16} /></span>
          </a>
        ))}
      </div>
      {lista.length === 0 ? <p className="empty">Pronto publicaremos artículos aquí.</p> : null}
    </>
  );
}
