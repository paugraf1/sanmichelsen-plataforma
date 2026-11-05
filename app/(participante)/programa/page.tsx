import Link from 'next/link';
import { Bar, Icon, PageHead, Tag } from '@/components/ui';
import { FASES } from '@/lib/data/tipos';
import { getModulos } from '@/lib/data/participante';

export const metadata = { title: 'Mi programa' };

const ETQ = { completado: <Tag tone="ok">Completado</Tag>, en_curso: <Tag tone="warn">En curso</Tag>, disponible: <Tag>Disponible</Tag>, bloqueado: <Tag>Bloqueado</Tag> };

export default async function Programa() {
  const mods = await getModulos();
  const hechos = mods.filter((m) => m.estado === 'completado').length;
  const pct = Math.round((hechos / 13) * 100);
  return (
    <>
      <PageHead eyebrow="Mi programa" title={<>13 módulos, <i>4 fases.</i></>} lead="Sandra libera los siguientes módulos conforme avanzas en tus sesiones." />
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="row sb"><b style={{ fontWeight: 600 }}>Tu avance</b><b>{pct}%</b></div>
        <Bar value={pct} label="Avance del programa" />
      </div>
      {FASES.map((f, i) => (
        <section key={f.clave} className="card w" style={{ marginBottom: 16 }} aria-labelledby={`fase-${f.clave}`}>
          <div className="hd"><h2 className="hs" id={`fase-${f.clave}`}>Fase 0{i + 1} · {f.nombre}</h2></div>
          <div className="mods">
            {mods.filter((m) => m.fase === f.clave).map((m) => {
              const inner = (
                <>
                  <div className="row sb"><span className="num">Módulo {String(m.numero).padStart(2, '0')}</span>{m.estado === 'bloqueado' ? <Icon name="lock" size={16} /> : null}</div>
                  <h4>{m.titulo}</h4>
                  <div style={{ marginTop: 'auto' }}>{ETQ[m.estado]}</div>
                </>
              );
              return m.estado === 'bloqueado'
                ? <div key={m.numero} className="mod lock" aria-disabled="true">{inner}</div>
                : <Link key={m.numero} href={`/programa/${m.numero}`} className={`mod${m.estado === 'completado' ? ' done' : m.estado === 'en_curso' ? ' cur' : ''}`}>{inner}</Link>;
            })}
          </div>
        </section>
      ))}
      <div className="cert">
        <Icon name="award" size={30} />
        <h2 className="hs">Certificado de conclusión</h2>
        <p className="mut" style={{ margin: 0, maxWidth: 440 }}>{hechos === 13 ? '¡Felicidades! Ya puedes descargar tu certificado y compartirlo en LinkedIn.' : 'Se libera cuando completes los 13 módulos.'}</p>
        {hechos === 13 ? <button type="button" className="btn"><Icon name="download" size={16} />Descargar certificado</button> : <button type="button" className="btn o" disabled><Icon name="lock" size={16} />Aún no disponible</button>}
      </div>
    </>
  );
}
