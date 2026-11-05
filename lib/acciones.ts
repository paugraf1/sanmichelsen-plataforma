'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { MODO_DEMO, SITE_URL } from './config';
import { supabaseServidor } from './supabase/server';
import { demo } from './data/demo';
import { getYo, requiereParticipante } from './data/participante';
import type { Etapa, Paso } from './data/tipos';

export type Resultado = { ok: true; mensaje?: string } | { ok: false; error: string };
const bien = (mensaje?: string): Resultado => ({ ok: true, mensaje });
const mal = (e: unknown): Resultado => ({ ok: false, error: e instanceof Error ? e.message : typeof e === 'object' && e && 'message' in e ? String((e as { message: unknown }).message) : 'Algo salió mal, intenta de nuevo' });
const texto = (f: FormData, k: string, max = 4000) => String(f.get(k) ?? '').trim().slice(0, max);

/* ---------- Acceso ---------- */
export async function entrarConCorreo(_: Resultado | null, f: FormData): Promise<Resultado> {
  if (MODO_DEMO) redirect('/inicio');
  const sb = await supabaseServidor();
  const { error } = await sb.auth.signInWithPassword({ email: texto(f, 'correo', 200), password: String(f.get('contrasena') ?? '') });
  if (error) return { ok: false, error: 'Correo o contraseña incorrectos' };
  const volver = texto(f, 'volver', 200);
  redirect(volver.startsWith('/') && !volver.startsWith('//') ? volver : '/inicio');
}

async function entrarConProveedor(proveedor: 'google' | 'linkedin_oidc'): Promise<void> {
  if (MODO_DEMO) redirect('/inicio');
  const sb = await supabaseServidor();
  const { data, error } = await sb.auth.signInWithOAuth({ provider: proveedor, options: { redirectTo: `${SITE_URL}/auth/callback` } });
  if (error || !data.url) redirect('/login?error=proveedor');
  redirect(data.url);
}
export async function entrarConGoogle() { await entrarConProveedor('google'); }
export async function entrarConLinkedIn() { await entrarConProveedor('linkedin_oidc'); }

export async function recuperarContrasena(_: Resultado | null, f: FormData): Promise<Resultado> {
  if (MODO_DEMO) return bien('En la plataforma real te llega un correo para crear una contraseña nueva.');
  const sb = await supabaseServidor();
  await sb.auth.resetPasswordForEmail(texto(f, 'correo', 200), { redirectTo: `${SITE_URL}/auth/callback?siguiente=/primer-ingreso` });
  return bien('Si tu correo está registrado, te llega un enlace para crear una contraseña nueva.');
}

export async function salir() {
  if (!MODO_DEMO) { const sb = await supabaseServidor(); await sb.auth.signOut(); }
  redirect('/login');
}

export async function completarPrimerIngreso(_: Resultado | null, f: FormData): Promise<Resultado> {
  const pass = String(f.get('contrasena') ?? ''), pass2 = String(f.get('contrasena2') ?? '');
  if (!f.get('privacidad') || !f.get('terminos') || !f.get('compartir')) return { ok: false, error: 'Para entrar necesitas aceptar las tres casillas' };
  const necesitaPass = f.get('necesita_contrasena') === '1';
  if (necesitaPass) {
    if (pass.length < 8) return { ok: false, error: 'La contraseña debe tener al menos 8 caracteres' };
    if (pass !== pass2) return { ok: false, error: 'Las contraseñas no coinciden' };
  }
  if (MODO_DEMO) { demo().primerIngreso = true; redirect('/inicio'); }
  const sb = await supabaseServidor();
  if (necesitaPass) { const { error } = await sb.auth.updateUser({ password: pass }); if (error) return mal(error); }
  const { error } = await sb.rpc('completar_primer_ingreso', { compartir_perfil: true });
  if (error) return mal(error);
  redirect('/inicio');
}

/* ---------- Mi preparación ---------- */
export async function marcarPaso(paso: Paso): Promise<Resultado> {
  try {
    if (paso === 'resultados') return { ok: false, error: 'Los resultados los sube el equipo' };
    if (MODO_DEMO) { const d = demo(); if (!d.pasos.includes(paso)) d.pasos.push(paso); }
    else {
      const yo = await requiereParticipante(); const sb = await supabaseServidor();
      const { error } = await sb.rpc('marcar_paso', { insc: yo.inscripcion.id, p: paso }); if (error) throw error;
    }
    revalidatePath('/preparacion'); revalidatePath('/inicio');
    return bien('Listo, lo marcamos');
  } catch (e) { return mal(e); }
}

export async function guardarNecesidades(_: Resultado | null, f: FormData): Promise<Resultado> {
  const v = { momento: texto(f, 'momento', 200), rol: texto(f, 'rol', 200), primero: texto(f, 'primero', 200) };
  try {
    if (MODO_DEMO) { const d = demo(); d.necesidades = v; if (!d.pasos.includes('necesidades')) d.pasos.push('necesidades'); }
    else {
      const yo = await requiereParticipante(); const sb = await supabaseServidor();
      const { error } = await sb.from('necesidades').upsert({ inscripcion_id: yo.inscripcion.id, momento: v.momento, rol_a_explorar: v.rol, trabajar_primero: v.primero });
      if (error) throw error;
    }
    revalidatePath('/preparacion');
    return bien('Gracias, tu consultor ya lo puede ver');
  } catch (e) { return mal(e); }
}

/* ---------- Módulos y actividades ---------- */
export async function guardarRespuesta(_: Resultado | null, f: FormData): Promise<Resultado> {
  const modulo = Number(f.get('modulo')); const enviar = f.get('accion') === 'enviar';
  const ids = String(f.get('actividades') ?? '').split(',').filter(Boolean);
  try {
    if (enviar && ids.some((id) => !texto(f, `t_${id}`) && !texto(f, `o_${id}`))) return { ok: false, error: 'Contesta todas las preguntas antes de enviar' };
    if (MODO_DEMO) {
      const d = demo();
      ids.forEach((id) => { d.respuestas[id] = { texto: texto(f, `t_${id}`) || null, opcion: texto(f, `o_${id}`) || null, estado: enviar ? 'enviada' : 'borrador', retro: null, retroPor: null, retroEn: null }; });
      if (enviar && d.modulos[modulo] === 'disponible') d.modulos[modulo] = 'en_curso';
    } else {
      const yo = await requiereParticipante(); const sb = await supabaseServidor();
      const filas = ids.map((id) => ({ inscripcion_id: yo.inscripcion.id, actividad_id: id, texto: texto(f, `t_${id}`) || null, opcion: texto(f, `o_${id}`) || null, estado: enviar ? 'enviada' : 'borrador' }));
      const { error } = await sb.from('respuestas').upsert(filas, { onConflict: 'inscripcion_id,actividad_id' });
      if (error) throw error;
      await sb.rpc('empezar_modulo', { insc: yo.inscripcion.id, num: modulo });
    }
    revalidatePath(`/programa/${modulo}`);
    return bien(enviar ? 'Enviada a revisión · tu consultor recibe un aviso' : 'Borrador guardado');
  } catch (e) { return mal(e); }
}

export async function completarModulo(modulo: number): Promise<Resultado> {
  try {
    if (MODO_DEMO) {
      const d = demo(); if (!['disponible', 'en_curso'].includes(d.modulos[modulo])) return { ok: false, error: 'Este módulo no está disponible' };
      d.modulos[modulo] = 'completado';
    } else {
      const yo = await requiereParticipante(); const sb = await supabaseServidor();
      const { error } = await sb.rpc('completar_modulo', { insc: yo.inscripcion.id, num: modulo }); if (error) throw error;
    }
    revalidatePath('/programa'); revalidatePath(`/programa/${modulo}`); revalidatePath('/inicio');
    return bien('¡Módulo completado!');
  } catch (e) { return mal(e); }
}

/* ---------- Sesiones ---------- */
export async function cancelarSesion(id: string): Promise<Resultado> {
  try {
    if (MODO_DEMO) {
      const s = demo().sesiones.find((x) => x.id === id);
      if (!s || s.estado !== 'agendada') return { ok: false, error: 'La sesión no está agendada' };
      if (new Date(s.iniciaEn).getTime() - Date.now() < 24 * 3600e3) return { ok: false, error: 'Con menos de 24 h la sesión cuenta como impartida. Escríbenos si es una emergencia.' };
      s.estado = 'cancelada';
    } else {
      const sb = await supabaseServidor();
      const { error } = await sb.rpc('cancelar_sesion', { sid: id }); if (error) throw error;
    }
    revalidatePath('/sesiones');
    return bien('Sesión cancelada · se regresó a tu contador');
  } catch (e) { return mal(e); }
}

/* ---------- Búsqueda ---------- */
export async function guardarObjetivo(_: Resultado | null, f: FormData): Promise<Resultado> {
  const sectores = f.getAll('sectores').map(String).slice(0, 4);
  const v = { rol: texto(f, 'rol', 120), funcion: texto(f, 'funcion', 80), ubicacion: texto(f, 'ubicacion', 120), modalidad: texto(f, 'modalidad', 40), nivel: texto(f, 'nivel', 40), sectores };
  try {
    if (MODO_DEMO) demo().busqueda.objetivo = v;
    else {
      const yo = await requiereParticipante(); const sb = await supabaseServidor();
      const { error } = await sb.from('perfil_objetivo').upsert({ inscripcion_id: yo.inscripcion.id, ...v }); if (error) throw error;
    }
    revalidatePath('/busqueda');
    return bien('Perfil objetivo guardado');
  } catch (e) { return mal(e); }
}

export async function agregarEmpresaMeta(_: Resultado | null, f: FormData): Promise<Resultado> {
  const nombre = texto(f, 'nombre', 120), tier = Math.min(3, Math.max(1, Number(f.get('tier')) || 2));
  if (!nombre) return { ok: false, error: 'Escribe el nombre de la empresa' };
  try {
    if (MODO_DEMO) {
      const b = demo().busqueda; if (b.empresas.length >= 50) return { ok: false, error: 'Ya tienes 50 empresas meta' };
      b.empresas.push({ id: `e${Date.now()}`, nombre, tier, contacto: null, estado: 'por_contactar' });
    } else {
      const yo = await requiereParticipante(); const sb = await supabaseServidor();
      const { error } = await sb.from('empresas_meta').insert({ inscripcion_id: yo.inscripcion.id, nombre, tier }); if (error) throw error;
    }
    revalidatePath('/busqueda');
    return bien('Empresa agregada');
  } catch (e) { return mal(e); }
}

export async function agregarPostulacion(_: Resultado | null, f: FormData): Promise<Resultado> {
  const puesto = texto(f, 'puesto', 120), empresa = texto(f, 'empresa', 120);
  if (!puesto || !empresa) return { ok: false, error: 'Escribe el puesto y la empresa' };
  try {
    if (MODO_DEMO) demo().busqueda.postulaciones.unshift({ id: `p${Date.now()}`, puesto, empresa, etapa: 'por_aplicar' });
    else {
      const yo = await requiereParticipante(); const sb = await supabaseServidor();
      const { error } = await sb.from('postulaciones').insert({ inscripcion_id: yo.inscripcion.id, puesto, empresa }); if (error) throw error;
    }
    revalidatePath('/busqueda');
    return bien('Postulación agregada');
  } catch (e) { return mal(e); }
}

const ETAPAS: Etapa[] = ['por_aplicar', 'aplicada', 'entrevista', 'oferta'];
export async function moverPostulacion(id: string, paso: 1 | -1): Promise<Resultado> {
  try {
    if (MODO_DEMO) {
      const p = demo().busqueda.postulaciones.find((x) => x.id === id); if (!p) throw new Error('No encontrada');
      p.etapa = ETAPAS[Math.min(3, Math.max(0, ETAPAS.indexOf(p.etapa) + paso))];
    } else {
      const sb = await supabaseServidor();
      const { data, error: e1 } = await sb.from('postulaciones').select('etapa').eq('id', id).single(); if (e1) throw e1;
      const etapa = ETAPAS[Math.min(3, Math.max(0, ETAPAS.indexOf(data.etapa) + paso))];
      const { error } = await sb.from('postulaciones').update({ etapa }).eq('id', id); if (error) throw error;
    }
    revalidatePath('/busqueda');
    return bien();
  } catch (e) { return mal(e); }
}

export async function guardarVacante(id: string, guardada: boolean): Promise<Resultado> {
  try {
    if (MODO_DEMO) { const v = demo().busqueda.vacantes.find((x) => x.id === id); if (v) v.guardada = guardada; }
    else { const sb = await supabaseServidor(); const { error } = await sb.from('vacantes_sugeridas').update({ guardada }).eq('id', id); if (error) throw error; }
    revalidatePath('/busqueda');
    return bien(guardada ? 'Vacante guardada' : 'Vacante quitada');
  } catch (e) { return mal(e); }
}

/* ---------- Comunidad ---------- */
export async function aceptarReglas(): Promise<Resultado> {
  try {
    if (MODO_DEMO) demo().comunidad.aceptoReglas = true;
    else { const sb = await supabaseServidor(); const { error } = await sb.rpc('aceptar_reglas'); if (error) throw error; }
    revalidatePath('/comunidad');
    return bien('¡Bienvenida a Elite Titans! Ya puedes unirte al grupo de WhatsApp');
  } catch (e) { return mal(e); }
}

export async function agregarContacto(_: Resultado | null, f: FormData): Promise<Resultado> {
  const c = { empresa: texto(f, 'empresa', 120), nombre: texto(f, 'nombre', 120), puesto: texto(f, 'puesto', 120), sector: texto(f, 'sector', 60), correo: texto(f, 'correo', 160), linkedin: texto(f, 'linkedin', 200) };
  if (!c.empresa || !c.puesto) return { ok: false, error: 'Escribe al menos la empresa y el puesto' };
  try {
    if (MODO_DEMO) demo().comunidad.misContactos.push({ empresa: c.empresa, nombre: c.nombre || '[Nombre]', puesto: c.puesto, sector: c.sector });
    else {
      const yo = await getYo(); const sb = await supabaseServidor();
      const { error } = await sb.from('contactos_estrategicos').insert({ agregado_por: yo.id, empresa: c.empresa, nombre: c.nombre || null, puesto: c.puesto, sector: c.sector || null, correo: c.correo || null, linkedin: c.linkedin || null });
      if (error) throw error;
    }
    revalidatePath('/comunidad');
    return bien('Contacto agregado · gracias por sumar a la red');
  } catch (e) { return mal(e); }
}

export async function guardarFicha(_: Resultado | null, f: FormData): Promise<Resultado> {
  const v = { anterior: texto(f, 'anterior', 160), actual: texto(f, 'actual', 160), busca: texto(f, 'busca', 160), linkedin: texto(f, 'linkedin', 200), telefono: texto(f, 'telefono', 40), cumple: texto(f, 'cumple', 20) };
  if (!v.anterior) return { ok: false, error: 'Escribe tu empresa y puesto anterior' };
  try {
    if (MODO_DEMO) demo().comunidad.ficha = true;
    else {
      const yo = await getYo(); const sb = await supabaseServidor();
      const { error } = await sb.from('comunidad_miembros').upsert({ perfil_id: yo.id, nombre: yo.nombre, correo: yo.correo, empresa_puesto_anterior: v.anterior, empresa_actual: v.actual || null, puesto_buscado: v.busca || null, linkedin: v.linkedin || null, telefono: v.telefono || null, cumpleanos: v.cumple || null });
      if (error) throw error;
    }
    revalidatePath('/comunidad');
    return bien('Ficha guardada · el equipo la aprueba para el directorio');
  } catch (e) { return mal(e); }
}
