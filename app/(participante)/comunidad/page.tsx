import Link from 'next/link';
import { Bar, Icon, PageHead, Tag } from '@/components/ui';
import { BotonAccion, BotonVentana, Enviar, FormAccion } from '@/components/ui/cliente';
import { aceptarReglas, agregarContacto, guardarFicha } from '@/lib/acciones';
import { WHATSAPP_URL } from '@/lib/config';
import { getBusqueda, getComunidad } from '@/lib/data/participante';

export const metadata = { title: 'Comunidad Elite Titans' };

const SECTORES = ['Consumo', 'Retail', 'Logística', 'Manufactura', 'Farmacéutica', 'Tecnología', 'Servicios financieros', 'Energía', 'Otro'];

function FormContacto() {
  return (
    <FormAccion accion={agregarContacto} className="stack" limpiar>
      <p className="mut sm" style={{ margin: 0 }}>Personas clave de tu empresa anterior (RH, talento o dirección) que puedan recibir a otros miembros. Solo los ven miembros con programa activo.</p>
      <div className="grid g2" style={{ margin: 0 }}>
        <label className="fl">Empresa<input className="in" name="empresa" required maxLength={120} /></label>
        <label className="fl">Puesto<input className="in" name="puesto" required maxLength={120} placeholder="CHRO, VP de Talento…" /></label>
        <label className="fl">Nombre<input className="in" name="nombre" maxLength={120} /></label>
        <label className="fl">Sector<select className="in" name="sector" defaultValue="Consumo">{SECTORES.map((s) => <option key={s}>{s}</option>)}</select></label>
        <label className="fl">Correo<input className="in" name="correo" type="email" maxLength={160} /></label>
        <label className="fl">LinkedIn<input className="in" name="linkedin" maxLength={200} /></label>
      </div>
      <Enviar>Agregar contacto</Enviar>
    </FormAccion>
  );
}

export default async function Comunidad({ searchParams }: { searchParams: Promise<{ db?: string }> }) {
  const { db = 'miembros' } = await searchParams;
  const [c, b] = await Promise.all([getComunidad(), getBusqueda()]);
  const pasos = [
    { t: 'Mapea tus 50 empresas meta', hecho: b.empresas.length >= 50, d: `Se conecta con tus empresas meta de Mi búsqueda. Llevas ${b.empresas.length} de 50.`, accion: <Link className="btn o s" href="/busqueda?paso=empresas">Ver mis empresas</Link> },
    { t: 'Súmate al directorio', hecho: c.ficha, d: c.ficha ? (c.aprobado ? 'Ya apareces en el directorio.' : 'Tu ficha está en revisión del equipo.') : 'Tu ficha con tu trayectoria y lo que buscas.', accion: (
      <BotonVentana className="btn o s" etiqueta={c.ficha ? 'Editar mi ficha' : 'Llenar mi ficha'} titulo="Tu ficha en el directorio" eyebrow="Elite Titans">
        <FormAccion accion={guardarFicha} className="stack">
          <label className="fl">Empresa y puesto anterior<input className="in" name="anterior" required maxLength={160} placeholder="Directora de Finanzas · Empresa de consumo" /></label>
          <label className="fl">Empresa actual<input className="in" name="actual" maxLength={160} placeholder="En búsqueda" /></label>
          <label className="fl">Puesto que buscas<input className="in" name="busca" maxLength={160} /></label>
          <div className="grid g2" style={{ margin: 0 }}>
            <label className="fl">LinkedIn<input className="in" name="linkedin" maxLength={200} /></label>
            <label className="fl">Teléfono<input className="in" name="telefono" maxLength={40} /></label>
          </div>
          <label className="fl">Cumpleaños (día y mes)<input className="in" name="cumple" maxLength={20} placeholder="8 de febrero" /></label>
          <Enviar>Guardar ficha</Enviar>
        </FormAccion>
      </BotonVentana>) },
    { t: 'Lee y acepta las reglas', hecho: c.aceptoReglas, d: 'Al aceptarlas se abre el link al grupo de WhatsApp.', accion: <a className="btn o s" href="#reglas">Ir a las reglas</a> },
    { t: 'Agrega mínimo 5 contactos estratégicos', hecho: c.misContactos >= 5, d: `De tu empresa anterior. Llevas ${c.misContactos} de 5. Sin ellos no se abren los directorios.`, accion: (
      <BotonVentana className="btn o s" etiqueta="Agregar contacto" titulo="Agregar contacto estratégico" eyebrow={`Llevas ${c.misContactos} de 5`}><FormContacto /></BotonVentana>) },
    { t: 'Busca contactos y conecta con headhunters', hecho: false, d: c.directorioAbierto ? 'Ya tienes acceso a los directorios.' : 'Se abre cuando completas los pasos 3 y 4.', accion: c.directorioAbierto ? <a className="btn o s" href="#directorios">Ir a los directorios</a> : <button type="button" className="btn o s" disabled><Icon name="lock" size={14} />Bloqueado</button> },
  ];
  const hechos = pasos.filter((p) => p.hecho).length;

  return (
    <>
      <PageHead eyebrow="Comunidad" title={<>Elite <i>Titans.</i></>} lead="Directores, VPs y C-Level que se ayudan entre sí. Solo para participantes con programa activo." />
      <div className="callout" style={{ marginBottom: 16 }}><Icon name="lock" /><span><b style={{ fontWeight: 600 }}>Información confidencial.</b> Lo que hay aquí es solo para miembros de Elite Titans. Está prohibido compartir, copiar o descargar el contenido.</span></div>

      <div className="card w" style={{ marginBottom: 16 }}>
        <div className="hd"><h2 className="hs">Checklist de activación</h2><span className="mut sm">{hechos} de 5</span></div>
        <Bar value={hechos * 20} label="Activación en la comunidad" />
        <div className="stack" style={{ gap: 0 }}>
          {pasos.map((p, i) => (
            <div key={p.t} className={`chk${p.hecho ? ' on' : ''}`} style={{ flexWrap: 'wrap' }}>
              <span className="bx">{p.hecho ? <Icon name="ok" size={14} /> : null}</span>
              <span style={{ flex: 1, minWidth: 200 }}><span className="tx" style={{ display: 'block', fontWeight: 500 }}>{i + 1}. {p.t}</span><span className="mut sm">{p.d}</span></span>
              {p.hecho && i !== 3 && i !== 1 ? null : p.accion}
            </div>
          ))}
        </div>
      </div>

      <div className="grid g12" id="reglas">
        <div className="card w c7">
          <div className="hd"><h2 className="hs">Las 10 reglas y el Código Elite Titans</h2></div>
          <ol style={{ margin: 0, paddingLeft: 22, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {Array.from({ length: 10 }, (_, i) => <li key={i}>[Regla {i + 1} · pendiente de Sandra]</li>)}
          </ol>
          <div className="callout" style={{ flexDirection: 'column' }}><span style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 20 }}>Código Elite Titans</span><span className="sm">[Texto del código, pendiente de Sandra]</span></div>
          {c.aceptoReglas ? <Tag tone="ok">Aceptaste las reglas</Tag> : <BotonAccion accion={aceptarReglas} className="btn s">Leí y acepto las reglas y el Código Elite Titans</BotonAccion>}
        </div>
        <div className="card d c5" style={{ justifyContent: 'space-between' }}>
          <div className="stack">
            <span className="eyebrow">Grupo de WhatsApp</span>
            <h2 className="hs" style={{ fontSize: 34 }}>Directores y VPs en un mismo chat.</h2>
            <p className="mut" style={{ margin: 0 }}>Vacantes, introducciones y eventos que se comparten entre miembros.</p>
          </div>
          {c.aceptoReglas
            ? <a className="btn l" href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">Unirme al grupo de WhatsApp <Icon name="arrow" size={16} /></a>
            : <button type="button" className="btn l" disabled><Icon name="lock" size={16} />Acepta las reglas para unirte</button>}
        </div>
      </div>

      <div className="card w" id="directorios">
        <div className="hd"><h2 className="hs">Directorios</h2>{c.directorioAbierto ? <BotonVentana className="btn o s" icono="plus" etiqueta="Agregar contacto" titulo="Agregar contacto estratégico"><FormContacto /></BotonVentana> : <Tag>Bloqueado</Tag>}</div>
        {!c.directorioAbierto ? (
          <div className="stack" style={{ alignItems: 'center', textAlign: 'center', padding: '24px 12px', gap: 12 }}>
            <span className="av lg"><Icon name="lock" size={22} /></span>
            <b style={{ fontWeight: 600, fontSize: 18 }}>Agrega 5 contactos estratégicos para entrar</b>
            <p className="mut sm" style={{ margin: 0, maxWidth: 460 }}>Los directorios de miembros, contactos y headhunters se abren cuando aceptas las reglas y compartes 5 contactos de tu empresa anterior. Se suman en automático al directorio de contactos. Llevas {c.misContactos} de 5.</p>
            <BotonVentana className="btn" icono="plus" etiqueta="Agregar contacto" titulo="Agregar contacto estratégico" eyebrow={`Llevas ${c.misContactos} de 5`}><FormContacto /></BotonVentana>
          </div>
        ) : (
          <>
            <nav className="chips" aria-label="Directorios">
              {[['miembros', 'Miembros', c.miembros.length], ['contactos', 'Contactos estratégicos en empresas', c.contactos.length], ['headhunters', 'Headhunters', c.headhunters.length]].map(([k, l, n]) => (
                <Link key={k} href={`?db=${k}#directorios`} className={`chip${db === k ? ' on' : ''}`} aria-current={db === k ? 'page' : undefined}>{l} <span className="xs" style={{ opacity: .7 }}>{n}</span></Link>
              ))}
            </nav>
            <div className="tbw">
              {db === 'miembros' ? <table className="tb"><thead><tr><th>Nombre</th><th>Empresa y puesto anterior</th><th>Empresa actual</th><th>Puesto buscado</th><th>LinkedIn</th></tr></thead><tbody>{c.miembros.map((m) => <tr key={m.nombre}><td data-l=""><b style={{ fontWeight: 600 }}>{m.nombre}</b></td><td data-l="Anterior">{m.anterior}</td><td data-l="Actual">{m.actual}</td><td data-l="Busca">{m.busca}</td><td data-l="LinkedIn">{m.linkedin ? <a className="lnk" href={m.linkedin} target="_blank" rel="noopener noreferrer">Perfil</a> : '—'}</td></tr>)}</tbody></table> : null}
              {db === 'contactos' ? <table className="tb"><thead><tr><th>Empresa</th><th>Nombre</th><th>Puesto</th><th>Sector</th></tr></thead><tbody>{c.contactos.map((m, i) => <tr key={i}><td data-l=""><b style={{ fontWeight: 600 }}>{m.empresa}</b></td><td data-l="Nombre">{m.nombre}</td><td data-l="Puesto">{m.puesto}</td><td data-l="Sector">{m.sector ? <Tag>{m.sector}</Tag> : '—'}</td></tr>)}</tbody></table> : null}
              {db === 'headhunters' ? <table className="tb"><thead><tr><th>Firma</th><th>Contacto</th><th>Especialidad</th></tr></thead><tbody>{c.headhunters.map((h) => <tr key={h.firma}><td data-l=""><b style={{ fontWeight: 600 }}>{h.firma}</b></td><td data-l="Contacto">{h.contacto}</td><td data-l="Especialidad">{h.especialidad}</td></tr>)}</tbody></table> : null}
            </div>
          </>
        )}
      </div>
    </>
  );
}
