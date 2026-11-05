import { Icon, PageHead, Tag } from '@/components/ui';
import { BotonAccion, BotonVentana, Enviar, FormAccion } from '@/components/ui/cliente';
import { agregarEmpresaMeta, agregarPostulacion, guardarObjetivo, guardarVacante, moverPostulacion } from '@/lib/acciones';
import { getBusqueda } from '@/lib/data/participante';
import type { Etapa, EstadoMeta } from '@/lib/data/tipos';
import Link from 'next/link';

export const metadata = { title: 'Mi búsqueda' };

const PASOS = [['cv', 'CV', '1'], ['perfil', 'Perfil objetivo', '2'], ['empresas', 'Empresas meta', '3'], ['vacantes', 'Vacantes y seguimiento', '4']] as const;
const SECTORES = ['Consumo', 'Retail', 'Manufactura', 'Tecnología', 'Servicios financieros', 'Farmacéutica', 'Energía', 'Logística'];
const ETAPAS: [Etapa, string][] = [['por_aplicar', 'Por aplicar'], ['aplicada', 'Aplicada'], ['entrevista', 'Entrevista'], ['oferta', 'Oferta']];
const META: Record<EstadoMeta, [string, 'ok' | 'warn' | 'bad' | undefined]> = { por_contactar: ['Por contactar', undefined], contacto: ['Contacto', 'warn'], entrevista: ['Entrevista', 'ok'], descartada: ['Descartada', 'bad'] };
const opts = (l: string[], v: string) => l.map((o) => <option key={o} value={o}>{o}</option>).concat(v && !l.includes(v) ? [<option key={v} value={v}>{v}</option>] : []);

export default async function Busqueda({ searchParams }: { searchParams: Promise<{ paso?: string }> }) {
  const { paso = 'cv' } = await searchParams;
  const b = await getBusqueda();
  const tiers = [1, 2, 3].map((t) => b.empresas.filter((e) => e.tier === t).length);

  return (
    <>
      <PageHead eyebrow="Mi búsqueda" title={<>Tu búsqueda <i>en 4 pasos.</i></>} lead="Del CV a la oferta, todo en un solo lugar." />
      <nav className="chips tabs" aria-label="Pasos de tu búsqueda">
        {PASOS.map(([k, l, n]) => <Link key={k} href={`?paso=${k}`} className={`chip${paso === k ? ' on' : ''}`} aria-current={paso === k ? 'page' : undefined}><span className="num">{n}</span>{l}</Link>)}
      </nav>

      {paso === 'cv' ? (
        <div className="grid g12">
          <div className="card w c7">
            <div className="hd"><h2 className="hs">Versiones de tu CV</h2><button type="button" className="btn o s" disabled title="Se conecta con el almacenamiento privado"><Icon name="upload" size={16} />Subir nueva versión</button></div>
            <div className="list">
              {[...b.cvs].reverse().map((v) => (
                <div key={v.id} className="row sb wrap">
                  <span className="row"><Icon name="doc" /><span><b style={{ fontWeight: 600, fontSize: 14 }}>{v.etiqueta}</b><div className="mut xs">{v.fecha}</div></span></span>
                  {v.final ? <Tag tone="ok">Final</Tag> : v.inicial ? <Tag>Inicial</Tag> : <Tag>En trabajo</Tag>}
                </div>
              ))}
              {b.cvs.length === 0 ? <span className="mut">Aún no hay versiones. Sube tu CV en Mi preparación.</span> : null}
            </div>
          </div>
          <div className="card c5">
            <h2 className="hs">Tu CV final</h2>
            <p className="mut sm" style={{ margin: 0 }}>Tu consultor lo trabaja contigo. La versión final es la que compartimos con headhunters y contactos clave de tus empresas meta.</p>
            <div className="callout" style={{ background: '#FCFCF2' }}><Icon name="lock" /><span className="sm">Nunca compartimos tu expectativa salarial ni tu teléfono sin preguntarte. Si no quieres que se comparta con alguna empresa, díselo a tu consultor.</span></div>
          </div>
        </div>
      ) : null}

      {paso === 'perfil' ? (
        <FormAccion accion={guardarObjetivo} className="card w">
          <h2 className="hs">Tu perfil objetivo</h2>
          <p className="mut sm" style={{ margin: 0 }}>Con esto buscamos vacantes para ti y armamos tu lista de empresas meta.</p>
          <div className="grid g3" style={{ margin: 0 }}>
            <label className="fl">Rol<input className="in" name="rol" defaultValue={b.objetivo.rol} placeholder="Directora de Finanzas" /></label>
            <label className="fl">Función<select className="in" name="funcion" defaultValue={b.objetivo.funcion || 'Finanzas'}>{opts(['Finanzas', 'Operaciones', 'Comercial', 'RH', 'Legal', 'Tecnología', 'Marketing', 'Dirección general'], b.objetivo.funcion)}</select></label>
            <label className="fl">Ubicación<input className="in" name="ubicacion" defaultValue={b.objetivo.ubicacion} placeholder="Ciudad de México" /></label>
            <label className="fl">Modalidad<select className="in" name="modalidad" defaultValue={b.objetivo.modalidad || 'Híbrido'}>{opts(['Presencial', 'Híbrido', 'Remoto'], b.objetivo.modalidad)}</select></label>
            <label className="fl">Nivel<select className="in" name="nivel" defaultValue={b.objetivo.nivel || 'Dirección'}>{opts(['Dirección', 'VP', 'C-Level'], b.objetivo.nivel)}</select></label>
          </div>
          <fieldset style={{ border: 0, padding: 0, margin: 0 }} className="stack">
            <legend className="sm" style={{ fontWeight: 500, marginBottom: 8 }}>Sectores · elige hasta 4</legend>
            <div className="chips">{SECTORES.map((s) => <label key={s} className="chip"><input type="checkbox" name="sectores" value={s} defaultChecked={b.objetivo.sectores.includes(s)} />{s}</label>)}</div>
          </fieldset>
          <Enviar className="btn s">Guardar perfil</Enviar>
        </FormAccion>
      ) : null}

      {paso === 'empresas' ? (
        <div className="card w">
          <div className="hd">
            <h2 className="hs">Empresas meta</h2>
            <span className="row wrap"><span className="mut sm">{b.empresas.length} de 50 · Tier 1 {tiers[0]} · Tier 2 {tiers[1]} · Tier 3 {tiers[2]}</span>
              <BotonVentana className="btn o s" icono="plus" etiqueta="Agregar empresa" titulo="Agregar empresa meta" eyebrow="Mi búsqueda">
                  <FormAccion accion={agregarEmpresaMeta} className="stack">
                    <label className="fl">Empresa<input className="in" name="nombre" required maxLength={120} /></label>
                    <label className="fl">Tier<select className="in" name="tier" defaultValue="2"><option value="1">Tier 1 · tus empresas soñadas</option><option value="2">Tier 2 · muy buenas opciones</option><option value="3">Tier 3 · plan B</option></select></label>
                    <Enviar>Agregar</Enviar>
                  </FormAccion>
              </BotonVentana>
            </span>
          </div>
          <div className="tbw">
            <table className="tb" style={{ minWidth: 520 }}>
              <thead><tr><th>Empresa</th><th>Tier</th><th>Contacto clave</th><th>Estatus</th></tr></thead>
              <tbody>{b.empresas.map((e) => <tr key={e.id}><td data-l="">{e.nombre}</td><td data-l="Tier"><Tag>Tier {e.tier}</Tag></td><td data-l="Contacto clave" className="mut">{e.contacto ?? '—'}</td><td data-l="Estatus"><Tag tone={META[e.estado][1]}>{META[e.estado][0]}</Tag></td></tr>)}</tbody>
            </table>
          </div>
          <p className="note">El estatus lo actualiza el equipo de Sandra conforme se hacen los acercamientos.</p>
        </div>
      ) : null}

      {paso === 'vacantes' ? (
        <>
          <div className="grid g12">
            <div className="card c7">
              <div className="hd"><h2 className="hs">Vacantes para tu perfil</h2><Tag>Con inteligencia artificial</Tag></div>
              <p className="mut sm" style={{ margin: 0 }}>Buscamos en LinkedIn y bolsas de empleo según tu perfil objetivo{b.objetivo.rol ? `: ${b.objetivo.rol}${b.objetivo.sectores.length ? ' · ' + b.objetivo.sectores.join(', ') : ''}${b.objetivo.ubicacion ? ' · ' + b.objetivo.ubicacion : ''}` : ''}.</p>
              <div className="list">
                {b.vacantes.map((v) => (
                  <div key={v.id} className="row sb">
                    <div><b style={{ fontWeight: 600, fontSize: 14 }}>{v.url ? <a href={v.url} target="_blank" rel="noopener noreferrer">{v.puesto}</a> : v.puesto}</b><div className="mut xs">{v.empresa} · {v.ubicacion} · {v.fuente}</div></div>
                    <BotonAccion className={`chip${v.guardada ? ' on' : ''}`} accion={guardarVacante.bind(null, v.id, !v.guardada)}>{v.guardada ? 'Guardada' : 'Guardar'}</BotonAccion>
                  </div>
                ))}
                {b.vacantes.length === 0 ? <span className="mut">Llena tu perfil objetivo y aquí aparecen las vacantes.</span> : null}
              </div>
            </div>
            <div className="card w c5">
              <h2 className="hs">Headhunters</h2>
              <p className="mut sm" style={{ margin: 0 }}>El directorio completo de headhunters está en Comunidad.</p>
              <Link className="btn o s" href="/comunidad">Ir a la comunidad</Link>
            </div>
          </div>
          <div className="card w">
            <div className="hd">
              <h2 className="hs">Seguimiento de postulaciones</h2>
              <BotonVentana className="btn o s" icono="plus" etiqueta="Agregar" titulo="Agregar postulación" eyebrow="Mi búsqueda">
                  <FormAccion accion={agregarPostulacion} className="stack">
                    <label className="fl">Puesto<input className="in" name="puesto" required maxLength={120} /></label>
                    <label className="fl">Empresa<input className="in" name="empresa" required maxLength={120} /></label>
                    <Enviar>Agregar</Enviar>
                  </FormAccion>
              </BotonVentana>
            </div>
            <div className="kan">
              {ETAPAS.map(([k, l], i) => {
                const lista = b.postulaciones.filter((p) => p.etapa === k);
                return (
                  <div key={k} className="kcol">
                    <div className="row sb"><b style={{ fontWeight: 600, fontSize: 14 }}>{l}</b><span className="mut xs">{lista.length}</span></div>
                    {lista.map((p) => (
                      <div key={p.id} className="kcard">
                        <b style={{ fontWeight: 600 }}>{p.puesto}</b><span className="mut xs">{p.empresa}</span>
                        <div className="row" style={{ marginTop: 6, gap: 6 }}>
                          {i > 0 ? <BotonAccion className="chip" accion={moverPostulacion.bind(null, p.id, -1)}><span aria-hidden="true">←</span><span className="sr">Regresar a {ETAPAS[i - 1][1]}</span></BotonAccion> : null}
                          {i < 3 ? <BotonAccion className="chip" accion={moverPostulacion.bind(null, p.id, 1)}>Avanzar →</BotonAccion> : null}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      ) : null}
    </>
  );
}
