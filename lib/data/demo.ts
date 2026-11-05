import 'server-only';
import type { Busqueda, Comunidad, EstadoModulo, Fase, Paso, Sesion, Articulo } from './tipos';

/* Datos de ejemplo para revisar la plataforma sin Supabase.
   Viven en memoria del servidor: se reinician cuando el servidor arranca de nuevo. */

const dias = (n: number, h = 10) => { const d = new Date(); d.setDate(d.getDate() + n); d.setHours(h, 0, 0, 0); return d.toISOString(); };

export const MODULOS_BASE: { numero: number; fase: Fase; titulo: string; minutos: number }[] = [
  { numero: 1, fase: 'reconecta', titulo: 'Redefiniendo tu carrera', minutos: 40 },
  { numero: 2, fase: 'reconecta', titulo: 'Desafío emocional en la transición', minutos: 35 },
  { numero: 3, fase: 'reconecta', titulo: 'Bienestar emocional', minutos: 30 },
  { numero: 4, fase: 'reconecta', titulo: 'Reinventa tu búsqueda', minutos: 40 },
  { numero: 5, fase: 'posicionate', titulo: 'Tu marca profesional', minutos: 45 },
  { numero: 6, fase: 'posicionate', titulo: 'Tu meta, tu éxito', minutos: 40 },
  { numero: 7, fase: 'posicionate', titulo: 'Habilidades y logros', minutos: 50 },
  { numero: 8, fase: 'posicionate', titulo: 'Tu mensaje de marca', minutos: 40 },
  { numero: 9, fase: 'activa', titulo: 'CV de alto impacto', minutos: 60 },
  { numero: 10, fase: 'activa', titulo: 'LinkedIn estratégico', minutos: 50 },
  { numero: 11, fase: 'activa', titulo: 'Estrategia profesional', minutos: 45 },
  { numero: 12, fase: 'concreta', titulo: 'Claves para entrevistas', minutos: 55 },
  { numero: 13, fase: 'concreta', titulo: 'Negociación integral', minutos: 50 },
];

interface Estado {
  primerIngreso: boolean;
  modulos: Record<number, EstadoModulo>;
  pasos: Paso[];
  necesidades: { momento: string; rol: string; primero: string } | null;
  respuestas: Record<string, { texto: string | null; opcion: string | null; estado: 'borrador' | 'enviada' | 'revisada'; retro: string | null; retroPor: string | null; retroEn: string | null }>;
  sesiones: Sesion[];
  creditos: { con: 'consultor' | 'sandra'; cantidad: number }[];
  busqueda: Busqueda;
  comunidad: { aceptoReglas: boolean; ficha: boolean; aprobado: boolean; misContactos: { empresa: string; nombre: string; puesto: string; sector: string }[] };
}

const g = globalThis as unknown as { __demoEta?: Estado };

function inicial(): Estado {
  const modulos: Record<number, EstadoModulo> = {};
  MODULOS_BASE.forEach((m) => { modulos[m.numero] = m.numero <= 5 ? 'completado' : m.numero === 6 ? 'en_curso' : m.numero <= 8 ? 'disponible' : 'bloqueado'; });
  return {
    primerIngreso: true,
    modulos,
    pasos: ['bienvenida', 'assessment', 'cv_inicial', 'resultados'],
    necesidades: null,
    respuestas: {
      'a5-1': { texto: 'Mi marca: transformación financiera en empresas de consumo, con equipos de 40 personas.', opcion: null, estado: 'revisada', retro: 'Muy bien, Mariana. Ahora ponle cifras a cada logro: cuánto ahorraste y en cuánto tiempo.', retroPor: 'Carlos Mendoza', retroEn: dias(-12) },
    },
    sesiones: [
      { id: 's1', con: 'consultor', titulo: 'Sesión 1 · Punto de partida', iniciaEn: dias(-30), estado: 'impartida', anfitrion: 'Carlos Mendoza', enlace: null },
      { id: 's2', con: 'consultor', titulo: 'Sesión 2 · Tu objetivo profesional', iniciaEn: dias(-23), estado: 'impartida', anfitrion: 'Carlos Mendoza', enlace: null },
      { id: 's3', con: 'sandra', titulo: 'Sesión con Sandra · LinkedIn y marca', iniciaEn: dias(-18), estado: 'impartida', anfitrion: 'Sandra Michelsen', enlace: null },
      { id: 's4', con: 'consultor', titulo: 'Sesión 3 · Logros con evidencia', iniciaEn: dias(-9), estado: 'impartida', anfitrion: 'Carlos Mendoza', enlace: null },
      { id: 's5', con: 'consultor', titulo: 'Sesión 4 · Estrategia de red', iniciaEn: dias(-4), estado: 'impartida', anfitrion: 'Carlos Mendoza', enlace: null },
      { id: 's6', con: 'consultor', titulo: 'Sesión 5 · CV de alto impacto', iniciaEn: dias(2), estado: 'agendada', anfitrion: 'Carlos Mendoza', enlace: 'https://meet.google.com/' },
    ],
    creditos: [],
    busqueda: {
      cvs: [
        { id: 'cv1', etiqueta: 'CV_Mariana_v1_inicial.pdf', fecha: '2 oct', final: false, inicial: true },
        { id: 'cv2', etiqueta: 'CV_Mariana_v2.pdf', fecha: '16 oct', final: false, inicial: false },
      ],
      compartirCv: true,
      objetivo: { rol: 'Directora de Finanzas', funcion: 'Finanzas', ubicacion: 'Ciudad de México', modalidad: 'Híbrido', nivel: 'Dirección', sectores: ['Consumo', 'Retail'] },
      empresas: [
        { id: 'e1', nombre: 'Grupo Bimbo', tier: 1, contacto: 'Contacto en la comunidad', estado: 'contacto' },
        { id: 'e2', nombre: 'FEMSA', tier: 1, contacto: 'Contacto en la comunidad', estado: 'entrevista' },
        { id: 'e3', nombre: 'Grupo Lala', tier: 1, contacto: null, estado: 'por_contactar' },
        { id: 'e4', nombre: 'Liverpool', tier: 2, contacto: null, estado: 'por_contactar' },
        { id: 'e5', nombre: 'Walmart de México', tier: 2, contacto: 'Contacto en la comunidad', estado: 'contacto' },
        { id: 'e6', nombre: 'Grupo Herdez', tier: 3, contacto: null, estado: 'por_contactar' },
      ],
      postulaciones: [
        { id: 'p1', puesto: 'Directora de Finanzas', empresa: 'Empresa de consumo', etapa: 'entrevista' },
        { id: 'p2', puesto: 'CFO', empresa: 'Retail regional', etapa: 'aplicada' },
        { id: 'p3', puesto: 'VP de Planeación Financiera', empresa: 'Grupo industrial', etapa: 'por_aplicar' },
      ],
      vacantes: [
        { id: 'v1', puesto: 'Directora de Finanzas', empresa: 'Empresa de bebidas', ubicacion: 'CDMX', fuente: 'LinkedIn', url: null, guardada: true },
        { id: 'v2', puesto: 'CFO', empresa: 'Cadena de retail', ubicacion: 'Monterrey', fuente: 'Bolsa de empleo', url: null, guardada: false },
        { id: 'v3', puesto: 'Directora de FP&A', empresa: 'Consumo masivo', ubicacion: 'CDMX · híbrido', fuente: 'LinkedIn', url: null, guardada: false },
      ],
    },
    comunidad: {
      aceptoReglas: false, ficha: false, aprobado: false,
      misContactos: [
        { empresa: 'Empresa de logística', nombre: '[Nombre]', puesto: 'CHRO', sector: 'Logística' },
        { empresa: 'Empresa de bebidas', nombre: '[Nombre]', puesto: 'VP de Talento', sector: 'Consumo' },
      ],
    },
  };
}

export function demo(): Estado {
  if (!g.__demoEta) g.__demoEta = inicial();
  return g.__demoEta;
}

export const DEMO_YO = {
  id: 'demo-mariana', nombre: 'Mariana Ríos', correo: 'mariana.rios@correo.com',
  programa: 'Ejecutivo', consultor: 'Carlos Mendoza', vence: '2027-04-30',
  sesionesConsultor: 7, sesionesSandra: 2,
};

export const DEMO_MIEMBROS = [
  { nombre: 'Alejandra Soto', anterior: 'VP de RH · Empresa de consumo', actual: 'En búsqueda', busca: 'VP de Recursos Humanos', linkedin: null },
  { nombre: 'Diego Ramírez', anterior: 'Director de Operaciones · Manufactura', actual: 'Grupo industrial', busca: 'COO', linkedin: null },
  { nombre: 'Laura Méndez', anterior: 'Directora Comercial · Farmacéutica', actual: 'En búsqueda', busca: 'Dirección Comercial', linkedin: null },
];
export const DEMO_CONTACTOS = [
  { empresa: 'Empresa de logística', nombre: '[Nombre]', puesto: 'CHRO', sector: 'Logística' },
  { empresa: 'Empresa de bebidas', nombre: '[Nombre]', puesto: 'VP de Talento', sector: 'Consumo' },
  { empresa: 'Grupo industrial', nombre: '[Nombre]', puesto: 'Director de RH', sector: 'Manufactura' },
];
export const DEMO_HEADHUNTERS = [
  { firma: 'Alcázar Search', contacto: '[Contacto]', especialidad: 'Finanzas y C-Level' },
  { firma: 'Meridian Talent', contacto: '[Contacto]', especialidad: 'Consumo y retail' },
  { firma: 'Norte Executive', contacto: '[Contacto]', especialidad: 'Manufactura' },
];
export const DEMO_ARTICULOS: Articulo[] = [
  { id: 'a1', titulo: 'Cómo hablar de una salida sin que pese en la entrevista', resumen: 'Tres frases para contar tu transición con seguridad.', url: 'https://www.linkedin.com/in/sandramichelsen', fecha: '2026-10-20' },
  { id: 'a2', titulo: 'Tu red vale más que tu CV', resumen: 'Por qué las posiciones ejecutivas rara vez se publican.', url: 'https://www.linkedin.com/in/sandramichelsen', fecha: '2026-10-06' },
];

export type ComunidadDemo = Comunidad;
