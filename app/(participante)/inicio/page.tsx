import Link from 'next/link';
import { Avatar, Bar, LinkBtn, PageHead, Stat, Tag, initials } from '@/components/ui';
import { FASES } from '@/lib/data/tipos';
import { getBusqueda, getModulos, getPreparacion, getSesiones, requiereParticipante } from '@/lib/data/participante';

export const metadata = { title: 'Mi inicio' };

const hoy = () => new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
const cuando = (iso: string) => new Date(iso).toLocaleString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });

export default async function Inicio() {
  const yo = await requiereParticipante();
  const [mods, { sesiones, saldos }, prep, busq] = await Promise.all([getModulos(), getSesiones(), getPreparacion(), getBusqueda()]);
  const hechos = mods.filter((m) => m.estado === 'completado').length;
  const sig = mods.find((m) => m.estado === 'en_curso') ?? mods.find((m) => m.estado === 'disponible');
  const fase = sig ? FASES.findIndex((f) => f.clave === sig.fase) : -1;
  const proxima = sesiones.filter((s) => s.estado === 'agendada').sort((a, b) => a.iniciaEn.localeCompare(b.iniciaEn))[0];
  const sc = saldos.find((s) => s.con === 'consultor'), ss = saldos.find((s) => s.con === 'sandra');
  const nombre = yo.nombre.split(' ')[0];
  const pasosHechos = prep.pasos.length;

  return (
    <>
      <PageHead eyebrow={hoy().replace(/^\w/, (c) => c.toUpperCase())}
        title={<>Hola, {nombre}. <i>{hechos === 13 ? 'Terminaste el programa.' : 'Vas muy bien.'}</i></>}
        lead={sig ? <>Estás en la fase {fase + 1}, {FASES[fase].nombre}. Este es tu siguiente paso.</> : 'Sandra libera tus siguientes módulos conforme avanzas en tus sesiones.'} />

      <div className="grid g12">
        <div className="card d c8">
          <div className="hd"><Tag tone="cream">Tu siguiente paso</Tag>{sig ? <span className="mut sm">Módulo {sig.numero} de 13</span> : null}</div>
          {sig ? (
            <>
              <h2 className="hs" style={{ fontSize: 38 }}>{sig.titulo}</h2>
              {sig.minutos ? <p className="mut" style={{ margin: 0 }}>Te toma alrededor de {sig.minutos} minutos: aprende, trabaja la actividad y llévala a tu sesión.</p> : null}
              <div className="row wrap"><LinkBtn href={`/programa/${sig.numero}`} kind="l" icon="arrow">{sig.estado === 'en_curso' ? 'Continuar módulo' : 'Empezar módulo'}</LinkBtn><LinkBtn href="/programa" kind="o">Ver mi programa</LinkBtn></div>
            </>
          ) : (
            <><h2 className="hs" style={{ fontSize: 34 }}>Ya completaste lo que tienes abierto.</h2><p className="mut" style={{ margin: 0 }}>Tu siguiente módulo se libera en tu próxima sesión.</p><LinkBtn href="/sesiones" kind="l">Ver mis sesiones</LinkBtn></>
          )}
        </div>
        <div className="card f c4">
          <span className="eyebrow">Tu equipo</span>
          <div className="stack" style={{ gap: 14 }}>
            {yo.inscripcion.consultor ? <div className="row"><Avatar initials={initials(yo.inscripcion.consultor.nombre)} dark /><div><b style={{ fontWeight: 600 }}>{yo.inscripcion.consultor.nombre}</b><div className="sm mut">Tu consultor</div></div></div> : null}
            <div className="row"><Avatar initials="SM" dark /><div><b style={{ fontWeight: 600 }}>Sandra Michelsen</b><div className="sm mut">Talent Promoter</div></div></div>
          </div>
          <p className="quote" style={{ fontSize: 21 }}>“Tu trayectoria es el punto de partida.”</p>
        </div>
      </div>

      <div className="grid g4">
        <Stat label="Módulos" value={`${hechos} de 13`} />
        <Stat label="Sesiones con tu consultor" value={sc && sc.total ? `${sc.usadas} de ${sc.total}` : '—'} />
        <Stat label="Sesiones con Sandra" value={ss && ss.total ? `${ss.usadas} de ${ss.total}` : '—'} />
        <Stat label="Empresas meta" value={`${busq.empresas.length} de 50`} />
      </div>

      <div className="grid g12">
        <div className="card c7">
          <div className="hd"><h2 className="hs">Próxima sesión</h2><LinkBtn href="/sesiones" kind="o" small>Mis sesiones</LinkBtn></div>
          {proxima ? (
            <div className="row wrap">
              <Avatar initials={initials(proxima.anfitrion || 'S M')} dark />
              <div style={{ flex: 1, minWidth: 200 }}><b style={{ fontWeight: 600 }}>{proxima.titulo}</b><div className="mut sm">{cuando(proxima.iniciaEn)} · con {proxima.anfitrion}</div></div>
              {proxima.enlace ? <LinkBtn href={proxima.enlace} small external>Entrar a la llamada</LinkBtn> : null}
            </div>
          ) : <p className="mut" style={{ margin: 0 }}>No tienes sesiones agendadas. <Link href="/sesiones">Agenda la siguiente</Link>.</p>}
        </div>
        <div className="card c5">
          <div className="hd"><h2 className="hs">Mi preparación</h2><span className="mut sm">{pasosHechos} de 6</span></div>
          <Bar value={(pasosHechos / 6) * 100} label="Mi preparación" />
          <LinkBtn href="/preparacion" kind="o" small>{pasosHechos >= 6 ? 'Ver mi preparación' : 'Ver pendientes'}</LinkBtn>
        </div>
      </div>

      <div className="card w">
        <div className="row sb wrap">
          <div><b style={{ fontWeight: 600 }}>¿Quieres seguir avanzando?</b><div className="mut sm">Suma paquetes de 1, 3 o 5 sesiones con tu consultor o con Sandra.</div></div>
          <LinkBtn href="/sesiones#sumar" kind="o" small icon="plus">Sumar sesiones</LinkBtn>
        </div>
      </div>
    </>
  );
}
