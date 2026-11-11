import { Avatar, Bar, Icon, PageHead, Tag, initials } from '@/components/ui';
import { BotonAccion } from '@/components/ui/cliente';
import { cancelarSesion } from '@/lib/acciones';
import { getSesiones, requiereParticipante } from '@/lib/data/participante';
import type { EstadoSesion } from '@/lib/data/tipos';

export const metadata = { title: 'Mis sesiones' };

const EST: Record<EstadoSesion, [string, 'ok' | 'warn' | 'bad' | undefined]> = {
  agendada: ['Agendada', 'warn'], impartida: ['Impartida', 'ok'], cancelada: ['Cancelada', undefined], cancelada_tarde: ['Cancelada con menos de 24 h', 'bad'],
};
const cuando = (iso: string) => new Date(iso).toLocaleString('es-MX', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

export default async function Sesiones() {
  const yo = await requiereParticipante();
  const { sesiones, saldos } = await getSesiones();
  const sc = saldos.find((s) => s.con === 'consultor') ?? { total: 0, usadas: 0, agendadas: 0 };
  const ss = saldos.find((s) => s.con === 'sandra') ?? { total: 0, usadas: 0, agendadas: 0 };
  const consultor = yo.inscripcion.consultor?.nombre ?? 'tu consultor';
  const conConsultor = sesiones.filter((s) => s.con === 'consultor' && (s.estado === 'impartida' || s.estado === 'cancelada_tarde')).length;
  const quedanC = sc.total - sc.usadas - sc.agendadas, quedanS = ss.total - ss.usadas - ss.agendadas;
  const vence = yo.inscripcion.vence ? new Date(yo.inscripcion.vence + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' }) : null;
  const ahora = Date.now();

  return (
    <>
      <PageHead eyebrow="Mis sesiones" title={<>Tus sesiones <i>1:1.</i></>}
        lead="Puedes reagendar o cancelar con más de 24 horas. Con menos de 24 horas la sesión cuenta como impartida."
        actions={<button type="button" className="btn" disabled title="Se conecta con Calendly"><Icon name="plus" size={16} />Agendar sesión</button>} />

      <div className="grid g2">
        <div className="card">
          <span className="mut sm">Con tu consultor · {consultor}</span>
          <span className="n">{sc.total ? `${sc.usadas} de ${sc.total}` : '—'}</span>
          <Bar value={sc.total ? (sc.usadas / sc.total) * 100 : 0} label="Sesiones con tu consultor" />
          <span className="mut sm">{sc.total ? (quedanC > 0 ? `Te quedan ${quedanC} por agendar` : 'Ya agendaste todas tus sesiones') : 'Tu programa no incluye sesiones con consultor'}</span>
        </div>
        <div className="card">
          <span className="mut sm">Con Sandra</span>
          <span className="n">{ss.total ? `${ss.usadas} de ${ss.total}` : '—'}</span>
          <Bar value={ss.total ? (ss.usadas / ss.total) * 100 : 0} label="Sesiones con Sandra" />
          <span className="mut sm">{!ss.total ? 'Tu programa no incluye sesiones con Sandra' : conConsultor < 2 ? `Se abre después de tus 2 primeras sesiones con ${consultor.split(' ')[0]}` : quedanS > 0 ? `Te quedan ${quedanS} por agendar` : 'Ya agendaste todas tus sesiones'}</span>
        </div>
      </div>

      <div className="card w" style={{ marginBottom: 16 }}>
        <h2 className="hs">Historial y próximas</h2>
        {sesiones.length ? (
          <div className="list">
            {sesiones.map((s) => {
              const [lab, tone] = EST[s.estado];
              const puedeCancelar = s.estado === 'agendada' && new Date(s.iniciaEn).getTime() - ahora > 24 * 3600e3;
              return (
                <div key={s.id} className="row sb wrap">
                  <div className="row"><Avatar initials={initials(s.anfitrion || 'S M')} dark /><div><b style={{ fontWeight: 600 }}>{s.titulo}</b><div className="mut sm">{cuando(s.iniciaEn)} · {s.anfitrion}</div></div></div>
                  <div className="row wrap">
                    <Tag tone={tone}>{lab}</Tag>
                    {s.estado === 'agendada' && s.enlace ? <a className="btn s" href={s.enlace} target="_blank" rel="noopener noreferrer">Entrar</a> : null}
                    {puedeCancelar ? <BotonAccion className="btn o s" accion={cancelarSesion.bind(null, s.id)} confirmar="¿Cancelar esta sesión? Se regresa a tu contador.">Cancelar</BotonAccion> : null}
                    {s.estado === 'agendada' && !puedeCancelar ? <span className="xs mut">Faltan menos de 24 h</span> : null}
                  </div>
                </div>
              );
            })}
          </div>
        ) : <p className="empty" style={{ margin: 0 }}>Todavía no tienes sesiones. Agenda la primera con tu consultor.</p>}
      </div>

      <div className="grid g2">
        <div className="card w" id="sumar">
          <h2 className="hs">¿Necesitas más?</h2>
          <p className="mut sm" style={{ margin: 0 }}>Suma paquetes de 1, 3 o 5 sesiones con tu consultor o con Sandra. Se agregan a tu contador en cuanto pagas.</p>
          <div className="grid g3" style={{ margin: 0 }}>
            {([[1, '3,500', ''], [3, '9,000', '$3,000 por sesión'], [5, '14,000', '$2,800 por sesión']] as const).map(([k, precio, nota]) => <div key={k} className="card" style={{ padding: 16, gap: 4 }}><span className="n" style={{ fontSize: 34 }}>{k}</span><span className="sm">{k === 1 ? 'sesión' : 'sesiones'}</span><span className="sm" style={{ fontWeight: 600 }}>${precio} MXN</span>{nota && <span className="xs mut">{nota}</span>}</div>)}
          </div>
          <span className="note">El pago con Stripe se conecta en la siguiente etapa.</span>
        </div>
        <div className="card">
          <h2 className="hs">Reglas</h2>
          <div className="list sm">
            <div>Primero 2 sesiones con tu consultor, luego tu sesión con Sandra.</div>
            <div>Cancelar con menos de 24 h cuenta como sesión impartida. Si es una emergencia, escríbenos.</div>
            {vence ? <div>Tu acceso termina el {vence}. Te avisamos 15 días antes.</div> : null}
          </div>
        </div>
      </div>
    </>
  );
}
