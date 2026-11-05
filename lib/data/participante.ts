import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { MODO_DEMO } from '../config';
import { supabaseServidor } from '../supabase/server';
import { DEMO_ARTICULOS, DEMO_CONTACTOS, DEMO_HEADHUNTERS, DEMO_MIEMBROS, DEMO_YO, MODULOS_BASE, demo } from './demo';
import type { Articulo, Busqueda, Comunidad, Modulo, ModuloDetalle, Preparacion, Saldo, Sesion, Yo } from './tipos';

const fecha = (iso: string) => new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });

/* ---------------- Quién soy ---------------- */
export const getYo = cache(async (): Promise<Yo> => {
  if (MODO_DEMO) {
    const d = demo();
    return {
      id: DEMO_YO.id, nombre: DEMO_YO.nombre, correo: DEMO_YO.correo, rol: 'participante', primerIngresoHecho: d.primerIngreso,
      inscripcion: { id: 'demo-insc', programa: DEMO_YO.programa, vence: DEMO_YO.vence, consultor: { nombre: DEMO_YO.consultor }, estado: 'activo' },
    };
  }
  const sb = await supabaseServidor();
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) redirect('/login');
  const { data: p } = await sb.from('perfiles').select('id, nombre, correo, rol, primer_ingreso_hecho').eq('id', auth.user.id).single();
  const { data: i } = await sb.from('inscripciones')
    .select('id, estado, vence_en, programas(nombre), consultores(perfiles(nombre))')
    .eq('participante_id', auth.user.id).order('creado_en', { ascending: false }).limit(1).maybeSingle();
  const insc = i as unknown as { id: string; estado: string; vence_en: string | null; programas: { nombre: string } | null; consultores: { perfiles: { nombre: string } | null } | null } | null;
  return {
    id: auth.user.id, nombre: p?.nombre || auth.user.email || '', correo: p?.correo || auth.user.email || '', rol: (p?.rol ?? 'participante') as Yo['rol'],
    primerIngresoHecho: !!p?.primer_ingreso_hecho,
    inscripcion: insc ? { id: insc.id, programa: insc.programas?.nombre ?? '', vence: insc.vence_en, consultor: insc.consultores?.perfiles ? { nombre: insc.consultores.perfiles.nombre } : null, estado: insc.estado } : null,
  };
});

/** Para pantallas del participante: exige sesión, primer ingreso hecho e inscripción. */
export async function requiereParticipante() {
  const yo = await getYo();
  if (!yo.primerIngresoHecho) redirect('/primer-ingreso');
  if (yo.rol !== 'participante') redirect('/sin-acceso');
  if (!yo.inscripcion) redirect('/sin-programa');
  return yo as Yo & { inscripcion: NonNullable<Yo['inscripcion']> };
}

/* ---------------- Módulos ---------------- */
export async function getModulos(): Promise<Modulo[]> {
  if (MODO_DEMO) { const d = demo(); return MODULOS_BASE.map((m) => ({ ...m, estado: d.modulos[m.numero] })); }
  const yo = await requiereParticipante();
  const sb = await supabaseServidor();
  const [{ data: mods }, { data: av }] = await Promise.all([
    sb.from('modulos').select('numero, fase, titulo, minutos').order('numero'),
    sb.from('avance_modulos').select('modulo, estado').eq('inscripcion_id', yo.inscripcion.id),
  ]);
  const est = new Map((av ?? []).map((a) => [a.modulo as number, a.estado as Modulo['estado']]));
  return (mods ?? []).map((m) => ({ numero: m.numero, fase: m.fase, titulo: m.titulo, minutos: m.minutos, estado: est.get(m.numero) ?? 'bloqueado' }));
}

const ACT_DEMO = (n: number) => [
  { id: `a${n}-1`, tipo: 'texto' as const, pregunta: n === 5 ? 'Escribe tu marca profesional en dos frases: qué haces mejor que nadie y para quién.' : 'Describe con tus palabras lo que te llevas de este módulo y cómo lo vas a aplicar en tu búsqueda.', opciones: null },
  { id: `a${n}-2`, tipo: 'opcion_multiple' as const, pregunta: '¿Qué pesa más en tu siguiente posición?', opciones: ['Crecimiento', 'Estabilidad', 'Propósito', 'Compensación'] },
];

export async function getModulo(numero: number): Promise<ModuloDetalle | null> {
  const lista = await getModulos();
  const base = lista.find((m) => m.numero === numero);
  if (!base) return null;
  if (MODO_DEMO) {
    const d = demo();
    const acts = ACT_DEMO(numero);
    const resp: ModuloDetalle['respuestas'] = {};
    acts.forEach((a) => { if (d.respuestas[a.id]) resp[a.id] = d.respuestas[a.id]; });
    return { ...base, lectura: base.estado === 'bloqueado' ? null : null, videoUrl: null, videoExternoUrl: null,
      recursos: base.estado === 'bloqueado' ? [] : [{ id: 'r1', titulo: 'Guía del módulo.pdf', url: null }, { id: 'r2', titulo: 'Hoja de trabajo.pdf', url: null }],
      actividades: base.estado === 'bloqueado' ? [] : acts, respuestas: resp };
  }
  const yo = await requiereParticipante();
  const sb = await supabaseServidor();
  const [{ data: c }, { data: rec }, { data: acts }] = await Promise.all([
    sb.from('modulo_contenido').select('lectura, video_url, video_externo_url').eq('modulo', numero).maybeSingle(),
    sb.from('modulo_recursos').select('id, titulo, url, archivo').eq('modulo', numero).order('orden'),
    sb.from('actividades').select('id, tipo, pregunta, opciones').eq('modulo', numero).order('orden'),
  ]);
  const ids = (acts ?? []).map((a) => a.id);
  const { data: rs } = ids.length
    ? await sb.from('respuestas').select('actividad_id, texto, opcion, estado, retro, retro_en, perfiles:retro_por(nombre)').eq('inscripcion_id', yo.inscripcion.id).in('actividad_id', ids)
    : { data: [] as never[] };
  const respuestas: ModuloDetalle['respuestas'] = {};
  (rs ?? []).forEach((r: Record<string, unknown>) => {
    respuestas[r.actividad_id as string] = { texto: r.texto as string | null, opcion: r.opcion as string | null, estado: r.estado as 'borrador', retro: r.retro as string | null, retroEn: r.retro_en as string | null, retroPor: (r.perfiles as { nombre: string } | null)?.nombre ?? null };
  });
  return { ...base, lectura: c?.lectura ?? null, videoUrl: c?.video_url ?? null, videoExternoUrl: c?.video_externo_url ?? null,
    recursos: (rec ?? []).map((r) => ({ id: r.id, titulo: r.titulo, url: r.url })),
    actividades: (acts ?? []).map((a) => ({ id: a.id, tipo: a.tipo, pregunta: a.pregunta, opciones: (a.opciones as string[] | null) ?? null })),
    respuestas };
}

/* ---------------- Sesiones ---------------- */
export async function getSesiones(): Promise<{ sesiones: Sesion[]; saldos: Saldo[] }> {
  if (MODO_DEMO) {
    const d = demo();
    const saldo = (con: 'consultor' | 'sandra', base: number): Saldo => ({
      con, total: base + d.creditos.filter((c) => c.con === con).reduce((s, c) => s + c.cantidad, 0),
      usadas: d.sesiones.filter((s) => s.con === con && (s.estado === 'impartida' || s.estado === 'cancelada_tarde')).length,
      agendadas: d.sesiones.filter((s) => s.con === con && s.estado === 'agendada').length,
    });
    return { sesiones: [...d.sesiones].sort((a, b) => b.iniciaEn.localeCompare(a.iniciaEn)), saldos: [saldo('consultor', DEMO_YO.sesionesConsultor), saldo('sandra', DEMO_YO.sesionesSandra)] };
  }
  const yo = await requiereParticipante();
  const sb = await supabaseServidor();
  const [{ data: ss }, { data: sal }] = await Promise.all([
    sb.from('sesiones').select('id, con, titulo, inicia_en, estado, enlace_llamada, perfiles:anfitrion_id(nombre)').eq('inscripcion_id', yo.inscripcion.id).order('inicia_en', { ascending: false }),
    sb.from('saldo_sesiones').select('con, total, usadas, agendadas').eq('inscripcion_id', yo.inscripcion.id),
  ]);
  return {
    sesiones: (ss ?? []).map((s: Record<string, unknown>) => ({ id: s.id as string, con: s.con as Sesion['con'], titulo: s.titulo as string, iniciaEn: s.inicia_en as string, estado: s.estado as Sesion['estado'], enlace: s.enlace_llamada as string | null, anfitrion: (s.perfiles as { nombre: string } | null)?.nombre ?? '' })),
    saldos: (sal ?? []).map((x) => ({ con: x.con, total: Number(x.total), usadas: Number(x.usadas), agendadas: Number(x.agendadas) })),
  };
}

/* ---------------- Preparación ---------------- */
export async function getPreparacion(): Promise<Preparacion> {
  if (MODO_DEMO) {
    const d = demo();
    return { pasos: d.pasos, cvInicial: { etiqueta: 'CV_Mariana_v1_inicial.pdf', fecha: '2 oct' }, reporteAssessment: d.pasos.includes('resultados'), necesidades: d.necesidades };
  }
  const yo = await requiereParticipante();
  const sb = await supabaseServidor();
  const [{ data: ps }, { data: cv }, { data: as }, { data: ne }, { data: s1 }] = await Promise.all([
    sb.from('preparacion').select('paso').eq('inscripcion_id', yo.inscripcion.id),
    sb.from('cv_versiones').select('etiqueta, creado_en').eq('inscripcion_id', yo.inscripcion.id).eq('es_inicial', true).maybeSingle(),
    sb.from('assessments').select('reporte').eq('inscripcion_id', yo.inscripcion.id).maybeSingle(),
    sb.from('necesidades').select('momento, rol_a_explorar, trabajar_primero').eq('inscripcion_id', yo.inscripcion.id).maybeSingle(),
    sb.from('sesiones').select('id').eq('inscripcion_id', yo.inscripcion.id).eq('con', 'consultor').neq('estado', 'cancelada').limit(1),
  ]);
  const pasos = new Set((ps ?? []).map((p) => p.paso as Preparacion['pasos'][number]));
  if (cv) pasos.add('cv_inicial');
  if (as?.reporte) pasos.add('resultados');
  if (ne) pasos.add('necesidades');
  if (s1 && s1.length) pasos.add('sesion_1');
  return { pasos: [...pasos], cvInicial: cv ? { etiqueta: cv.etiqueta, fecha: fecha(cv.creado_en) } : null, reporteAssessment: !!as?.reporte,
    necesidades: ne ? { momento: ne.momento ?? '', rol: ne.rol_a_explorar ?? '', primero: ne.trabajar_primero ?? '' } : null };
}

/* ---------------- Búsqueda ---------------- */
export async function getBusqueda(): Promise<Busqueda> {
  if (MODO_DEMO) return demo().busqueda;
  const yo = await requiereParticipante();
  const sb = await supabaseServidor();
  const id = yo.inscripcion.id;
  const [{ data: cvs }, { data: per }, { data: obj }, { data: em }, { data: po }, { data: va }] = await Promise.all([
    sb.from('cv_versiones').select('id, etiqueta, creado_en, es_final, es_inicial').eq('inscripcion_id', id).order('creado_en'),
    sb.from('perfiles').select('acepto_compartir_perfil_en').eq('id', yo.id).single(),
    sb.from('perfil_objetivo').select('*').eq('inscripcion_id', id).maybeSingle(),
    sb.from('empresas_meta').select('id, nombre, tier, contacto_clave, estado').eq('inscripcion_id', id).order('tier').order('nombre'),
    sb.from('postulaciones').select('id, puesto, empresa, etapa').eq('inscripcion_id', id).order('actualizado_en', { ascending: false }),
    sb.from('vacantes_sugeridas').select('id, puesto, empresa, ubicacion, fuente, url, guardada').eq('inscripcion_id', id).order('encontrada_en', { ascending: false }).limit(20),
  ]);
  return {
    cvs: (cvs ?? []).map((c) => ({ id: c.id, etiqueta: c.etiqueta, fecha: fecha(c.creado_en), final: c.es_final, inicial: c.es_inicial })),
    compartirCv: !!per?.acepto_compartir_perfil_en,
    objetivo: { rol: obj?.rol ?? '', funcion: obj?.funcion ?? '', ubicacion: obj?.ubicacion ?? '', modalidad: obj?.modalidad ?? '', nivel: obj?.nivel ?? '', sectores: obj?.sectores ?? [] },
    empresas: (em ?? []).map((e) => ({ id: e.id, nombre: e.nombre, tier: e.tier, contacto: e.contacto_clave, estado: e.estado })),
    postulaciones: po ?? [],
    vacantes: (va ?? []).map((v) => ({ id: v.id, puesto: v.puesto, empresa: v.empresa ?? '', ubicacion: v.ubicacion ?? '', fuente: v.fuente ?? '', url: v.url, guardada: v.guardada })),
  };
}

/* ---------------- Comunidad ---------------- */
export async function getComunidad(): Promise<Comunidad> {
  if (MODO_DEMO) {
    const c = demo().comunidad;
    const abierto = c.aceptoReglas && c.misContactos.length >= 5;
    return { aceptoReglas: c.aceptoReglas, ficha: c.ficha, aprobado: c.aprobado, misContactos: c.misContactos.length, directorioAbierto: abierto,
      miembros: abierto ? DEMO_MIEMBROS : [], contactos: abierto ? [...c.misContactos, ...DEMO_CONTACTOS.filter((x) => !c.misContactos.some((m) => m.empresa === x.empresa))] : [], headhunters: abierto ? DEMO_HEADHUNTERS : [] };
  }
  const yo = await requiereParticipante();
  const sb = await supabaseServidor();
  const [{ data: m }, { data: n }, { data: abierto }] = await Promise.all([
    sb.from('comunidad_miembros').select('acepto_reglas_en, aprobado, empresa_puesto_anterior').eq('perfil_id', yo.id).maybeSingle(),
    sb.rpc('contactos_que_agregue'),
    sb.rpc('puede_ver_directorio'),
  ]);
  let miembros: Comunidad['miembros'] = [], contactos: Comunidad['contactos'] = [], headhunters: Comunidad['headhunters'] = [];
  if (abierto) {
    const [{ data: mi }, { data: co }, { data: hh }] = await Promise.all([
      sb.from('comunidad_miembros').select('nombre, empresa_puesto_anterior, empresa_actual, puesto_buscado, linkedin').eq('aprobado', true).order('nombre').limit(500),
      sb.from('contactos_estrategicos').select('empresa, nombre, puesto, sector').order('empresa').limit(500),
      sb.from('headhunters').select('firma, contacto, especialidad').order('firma'),
    ]);
    miembros = (mi ?? []).map((x) => ({ nombre: x.nombre, anterior: x.empresa_puesto_anterior ?? '', actual: x.empresa_actual ?? '', busca: x.puesto_buscado ?? '', linkedin: x.linkedin }));
    contactos = (co ?? []).map((x) => ({ empresa: x.empresa, nombre: x.nombre ?? '', puesto: x.puesto, sector: x.sector ?? '' }));
    headhunters = (hh ?? []).map((x) => ({ firma: x.firma, contacto: x.contacto ?? '', especialidad: x.especialidad ?? '' }));
  }
  return { aceptoReglas: !!m?.acepto_reglas_en, ficha: !!m?.empresa_puesto_anterior, aprobado: !!m?.aprobado, misContactos: Number(n ?? 0), directorioAbierto: !!abierto, miembros, contactos, headhunters };
}

/* ---------------- Artículos ---------------- */
export async function getArticulos(): Promise<Articulo[]> {
  if (MODO_DEMO) return DEMO_ARTICULOS;
  const sb = await supabaseServidor();
  const { data } = await sb.from('articulos').select('id, titulo, resumen, url, publicado_en').eq('visible', true).order('publicado_en', { ascending: false });
  return (data ?? []).map((a) => ({ id: a.id, titulo: a.titulo, resumen: a.resumen ?? '', url: a.url, fecha: a.publicado_en }));
}
