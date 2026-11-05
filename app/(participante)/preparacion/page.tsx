import { Bar, Icon, PageHead, Tag } from '@/components/ui';
import { BotonAccion, Enviar, FormAccion } from '@/components/ui/cliente';
import { guardarNecesidades, marcarPaso } from '@/lib/acciones';
import { PYXOOM_URL } from '@/lib/config';
import { getPreparacion, requiereParticipante } from '@/lib/data/participante';

export const metadata = { title: 'Mi preparación' };

const MOMENTOS = ['Acabo de salir de mi empresa', 'Ya estoy buscando', 'Tengo entrevistas en curso', 'Estoy evaluando una oferta', 'Sigo trabajando y me preparo para un cambio'];
const PRIMERO = ['Mi CV y LinkedIn', 'Mi historia y mensaje', 'Entrevistas', 'Negociación', 'Lo emocional de la transición'];

export default async function Preparacion() {
  const yo = await requiereParticipante();
  const p = await getPreparacion();
  const hecho = (k: (typeof p.pasos)[number]) => p.pasos.includes(k);
  const n = p.pasos.length;
  const nombreConsultor = yo.inscripcion.consultor?.nombre.split(' ')[0] ?? 'tu consultor';

  return (
    <>
      <PageHead eyebrow="Mi preparación" title={<>Antes de tu <i>primera sesión.</i></>} lead={`Seis pasos para arrancar. ${nombreConsultor === 'tu consultor' ? 'Tu consultor' : nombreConsultor} ve este avance.`} />
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="row sb"><b style={{ fontWeight: 600 }}>{n} de 6 pasos</b><span className="mut sm">{Math.round((n / 6) * 100)}%</span></div>
        <Bar value={(n / 6) * 100} label="Avance de tu preparación" />
      </div>
      <div className="grid g2">
        <div className="card w">
          <div className="row sb"><Tag>Paso 1</Tag>{hecho('bienvenida') ? <Tag tone="ok">Listo</Tag> : null}</div>
          <h2 className="hs">Bienvenida de Sandra</h2>
          <div className="ph" style={{ aspectRatio: '16 / 9', flexDirection: 'column', gap: 12 }}><span className="av lg dk"><Icon name="play" size={22} /></span>Video de bienvenida</div>
          {!hecho('bienvenida') ? <BotonAccion className="btn s" accion={marcarPaso.bind(null, 'bienvenida')}>Ya lo vi</BotonAccion> : null}
        </div>

        <div className="card w">
          <div className="row sb"><Tag>Paso 2</Tag>{hecho('assessment') ? <Tag tone="ok">Terminado</Tag> : <Tag tone="warn">Pendiente</Tag>}</div>
          <h2 className="hs">Assessment en Pyxoom</h2>
          <p className="mut sm" style={{ margin: 0 }}>Toma alrededor de 45 minutos. Al terminar, regresa y confírmalo aquí.</p>
          <div className="row wrap">
            <a className="btn o s" href={PYXOOM_URL} target="_blank" rel="noopener noreferrer">Abrir Pyxoom <Icon name="arrow" size={16} /></a>
            {!hecho('assessment') ? <BotonAccion className="btn s" accion={marcarPaso.bind(null, 'assessment')}>Ya lo terminé</BotonAccion> : null}
          </div>
        </div>

        <div className="card w">
          <div className="row sb"><Tag>Paso 3</Tag>{p.cvInicial ? <Tag tone="ok">Recibido</Tag> : null}</div>
          <h2 className="hs">Tu CV actual</h2>
          <p className="mut sm" style={{ margin: 0 }}>Súbelo tal como está. Lo trabajamos juntos en tus sesiones.</p>
          {p.cvInicial
            ? <div className="row sb sm"><span className="row"><Icon name="doc" />{p.cvInicial.etiqueta}</span><span className="mut xs">{p.cvInicial.fecha}</span></div>
            : <div className="drop"><Icon name="upload" size={22} /><span className="sm">PDF o Word, máximo 15 MB</span><span className="note">La subida de archivos se conecta con el almacenamiento privado de Supabase.</span></div>}
        </div>

        <div className="card w">
          <div className="row sb"><Tag>Paso 4</Tag>{p.reporteAssessment ? <Tag tone="ok">Disponible</Tag> : <Tag tone="warn">En proceso</Tag>}</div>
          <h2 className="hs">Resultados del assessment</h2>
          <p className="mut sm" style={{ margin: 0 }}>El equipo sube tu reporte y lo revisas con tu consultor en la sesión 1.</p>
          {p.reporteAssessment ? <button type="button" className="btn o s"><Icon name="download" size={16} />Descargar reporte</button> : null}
        </div>

        <FormAccion accion={guardarNecesidades} className="card w">
          <div className="row sb"><Tag>Paso 5 · opcional</Tag>{hecho('necesidades') ? <Tag tone="ok">Enviado</Tag> : null}</div>
          <h2 className="hs">¿Qué necesitas hoy?</h2>
          <label className="fl">¿En qué momento estás?
            <select className="in" name="momento" defaultValue={p.necesidades?.momento ?? MOMENTOS[0]}>{MOMENTOS.map((m) => <option key={m}>{m}</option>)}</select>
          </label>
          <label className="fl">¿Qué rol quieres explorar?<input className="in" name="rol" defaultValue={p.necesidades?.rol ?? ''} placeholder="Dirección de Finanzas, VP…" /></label>
          <label className="fl">¿Qué quieres trabajar primero?
            <select className="in" name="primero" defaultValue={p.necesidades?.primero ?? PRIMERO[0]}>{PRIMERO.map((m) => <option key={m}>{m}</option>)}</select>
          </label>
          <Enviar className="btn s">{hecho('necesidades') ? 'Actualizar' : 'Enviar'}</Enviar>
        </FormAccion>

        <div className="card w">
          <div className="row sb"><Tag>Paso 6</Tag>{hecho('sesion_1') ? <Tag tone="ok">Agendada</Tag> : null}</div>
          <h2 className="hs">Tu sesión 1</h2>
          <p className="mut sm" style={{ margin: 0 }}>Primero tienes 2 sesiones con tu consultor y después se abre tu sesión con Sandra.</p>
          <a className="btn o s" href="/sesiones">Ir a mis sesiones</a>
        </div>
      </div>
    </>
  );
}
