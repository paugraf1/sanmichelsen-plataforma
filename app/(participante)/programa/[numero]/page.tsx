import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Avatar, Icon, LinkBtn, PageHead, Tag, initials } from '@/components/ui';
import { BotonAccion, Enviar, FormAccion } from '@/components/ui/cliente';
import { completarModulo, guardarRespuesta } from '@/lib/acciones';
import { FASES } from '@/lib/data/tipos';
import { getModulo, getSesiones, requiereParticipante } from '@/lib/data/participante';

type Props = { params: Promise<{ numero: string }>; searchParams: Promise<{ paso?: string }> };

export async function generateMetadata({ params }: Props) {
  const { numero } = await params;
  return { title: `Módulo ${numero}` };
}

const embed = (u: string) => {
  const y = u.match(/(?:youtu\.be\/|v=|embed\/)([\w-]{11})/); if (y) return `https://www.youtube-nocookie.com/embed/${y[1]}`;
  const v = u.match(/vimeo\.com\/(\d+)/); if (v) return `https://player.vimeo.com/video/${v[1]}`;
  return u;
};

export default async function Modulo({ params, searchParams }: Props) {
  const { numero } = await params; const { paso = 'aprende' } = await searchParams;
  const n = Number(numero); if (!Number.isInteger(n) || n < 1 || n > 13) notFound();
  const yo = await requiereParticipante();
  const m = await getModulo(n); if (!m) notFound();
  const fase = FASES.find((f) => f.clave === m.fase)!;
  const volver = <Link href="/programa" className="row sm" style={{ textDecoration: 'none', marginBottom: 18 }}><Icon name="back" size={16} />Mi programa</Link>;

  if (m.estado === 'bloqueado') {
    return <>{volver}<PageHead eyebrow={`Fase ${fase.nombre} · Módulo ${n} de 13`} title={m.titulo} lead="Este módulo todavía no está disponible. Sandra lo libera conforme avanzas en tus sesiones." actions={<LinkBtn href="/programa" kind="o" icon="back">Volver a mi programa</LinkBtn>} /></>;
  }

  const consultor = yo.inscripcion.consultor?.nombre ?? 'tu consultor';
  const enviadas = m.actividades.length > 0 && m.actividades.every((a) => m.respuestas[a.id] && m.respuestas[a.id].estado !== 'borrador');
  const retro = m.actividades.map((a) => m.respuestas[a.id]).find((r) => r?.retro);
  const tabs = [['aprende', 'Aprende', '1'], ['trabaja', 'Trabaja', '2'], ['conversa', 'Conversa', '3']] as const;
  let proxima: string | null = null;
  if (paso === 'conversa') {
    const { sesiones } = await getSesiones();
    const s = sesiones.filter((x) => x.estado === 'agendada').sort((a, b) => a.iniciaEn.localeCompare(b.iniciaEn))[0];
    if (s) proxima = `${new Date(s.iniciaEn).toLocaleString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })} con ${s.anfitrion}`;
  }

  return (
    <>
      {volver}
      <PageHead eyebrow={`Fase ${fase.nombre} · Módulo ${n} de 13`} title={m.titulo} actions={m.estado === 'completado' ? <Tag tone="ok">Completado</Tag> : undefined} />
      <nav className="chips tabs" aria-label="Partes del módulo">
        {tabs.map(([k, l, num]) => <Link key={k} href={`?paso=${k}`} className={`chip${paso === k ? ' on' : ''}`} aria-current={paso === k ? 'page' : undefined}><span className="num">{num}</span>{l}</Link>)}
      </nav>

      {paso === 'aprende' ? (
        <div className="grid g12">
          <div className="c8 stack" style={{ gap: 16 }}>
            {m.videoUrl ? <div className="video"><iframe src={embed(m.videoUrl)} title={`Masterclass · ${m.titulo}`} allow="fullscreen; picture-in-picture" /></div>
              : <div className="ph" style={{ aspectRatio: '16 / 9', borderRadius: 20, flexDirection: 'column', gap: 14 }}><span className="av lg dk"><Icon name="play" size={24} /></span>Masterclass de Sandra · próximamente</div>}
            <div className="card w">
              <h2 className="hs">Lectura</h2>
              {m.lectura ? <div style={{ color: '#4B535A', whiteSpace: 'pre-line' }}>{m.lectura}</div> : <p style={{ margin: 0, color: '#4B535A' }}>[Contenido del módulo escrito por Sandra: qué vas a lograr, por qué importa en tu búsqueda y cómo se conecta con tus sesiones.]</p>}
              {m.videoExternoUrl ? <div className="row sb sm"><span className="row"><Icon name="video" />Video recomendado</span><a className="lnk" href={m.videoExternoUrl} target="_blank" rel="noopener noreferrer">Ver</a></div> : null}
            </div>
          </div>
          <div className="c4 stack" style={{ gap: 16 }}>
            <div className="card">
              <h2 className="hs">Descargables</h2>
              <div className="list sm">
                {m.recursos.length ? m.recursos.map((r) => <div key={r.id} className="row sb"><span className="row"><Icon name="doc" />{r.titulo}</span>{r.url ? <a className="lnk" href={r.url} target="_blank" rel="noopener noreferrer">Descargar</a> : <span className="mut xs">Próximamente</span>}</div>) : <span className="mut">Este módulo no tiene descargables.</span>}
              </div>
            </div>
            <LinkBtn href="?paso=trabaja" icon="arrow">Siguiente: Trabaja</LinkBtn>
          </div>
        </div>
      ) : null}

      {paso === 'trabaja' ? (
        <div className="grid g12">
          <FormAccion accion={guardarRespuesta} className="card w c8">
            <input type="hidden" name="modulo" value={n} />
            <input type="hidden" name="actividades" value={m.actividades.map((a) => a.id).join(',')} />
            <div className="row sb wrap"><h2 className="hs">Actividad</h2>{enviadas ? <Tag tone="ok">{retro ? 'Revisada' : 'Enviada a revisión'}</Tag> : Object.keys(m.respuestas).length ? <Tag tone="warn">Borrador guardado</Tag> : <Tag>Sin empezar</Tag>}</div>
            {m.actividades.length === 0 ? <p className="mut" style={{ margin: 0 }}>Este módulo no tiene actividad. Pasa a Conversa.</p> : null}
            {m.actividades.map((a, i) => {
              const r = m.respuestas[a.id];
              if (a.tipo === 'opcion_multiple') return (
                <fieldset key={a.id} style={{ border: 0, padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <legend className="sm" style={{ fontWeight: 500, marginBottom: 8 }}>{i + 1} · {a.pregunta}</legend>
                  {(a.opciones ?? []).map((o) => <label key={o} className="check"><input type="radio" name={`o_${a.id}`} value={o} defaultChecked={r?.opcion === o} disabled={enviadas} />{o}</label>)}
                </fieldset>
              );
              return <label key={a.id} className="fl">{i + 1} · {a.pregunta}<textarea className="in" name={`t_${a.id}`} defaultValue={r?.texto ?? ''} readOnly={enviadas} placeholder="Tu respuesta…" /></label>;
            })}
            {!enviadas && m.actividades.length ? <div className="row wrap"><Enviar className="btn o s" name="accion" value="borrador">Guardar borrador</Enviar><Enviar className="btn s" name="accion" value="enviar">Enviar a revisión</Enviar></div> : null}
          </FormAccion>
          <div className="c4 stack" style={{ gap: 16 }}>
            <div className={`card${retro ? ' f' : ''}`}>
              <span className="eyebrow">Retroalimentación de tu consultor</span>
              {retro?.retro ? (
                <><p style={{ margin: 0 }}>{retro.retro}</p><div className="row"><Avatar initials={initials(retro.retroPor ?? consultor)} dark /><span className="sm">{retro.retroPor ?? consultor}{retro.retroEn ? ' · ' + new Date(retro.retroEn).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }) : ''}</span></div></>
              ) : <p className="mut sm" style={{ margin: 0 }}>{enviadas ? `${consultor.split(' ')[0]} la revisará antes de tu próxima sesión. Te avisamos por correo.` : `Cuando envíes tu actividad, aquí verás los comentarios de ${consultor.split(' ')[0]}.`}</p>}
            </div>
          </div>
        </div>
      ) : null}

      {paso === 'conversa' ? (
        <div className="grid g12">
          <div className="card d c7">
            <span className="eyebrow">Conversa</span>
            <h2 className="hs" style={{ fontSize: 34 }}>Llévalo a tu sesión 1:1</h2>
            <p className="mut" style={{ margin: 0 }}>{proxima ? `Tu próxima sesión es el ${proxima}. Lleva tu actividad y tus dudas.` : 'Agenda tu siguiente sesión y lleva tu actividad y tus dudas.'}</p>
            <div className="row wrap"><LinkBtn href="/sesiones" kind="l" small>Mis sesiones</LinkBtn><LinkBtn href="/consultor-virtual" kind="o" small icon="spark">Practicar con el consultor virtual</LinkBtn></div>
          </div>
          <div className="card w c5">
            <h2 className="hs">¿Terminaste el módulo?</h2>
            <p className="mut sm" style={{ margin: 0 }}>Márcalo como completado para avanzar tu barra. Tu consultor recibe aviso.</p>
            {m.estado === 'completado' ? <button type="button" className="btn" disabled>Completado</button> : <BotonAccion accion={completarModulo.bind(null, n)}><Icon name="ok" size={16} />Marcar como completado</BotonAccion>}
          </div>
        </div>
      ) : null}
    </>
  );
}
