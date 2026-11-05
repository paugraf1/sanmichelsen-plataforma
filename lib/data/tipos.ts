export type Rol = 'participante' | 'consultor' | 'operaciones' | 'admin' | 'empresa';
export type Fase = 'reconecta' | 'posicionate' | 'activa' | 'concreta';
export type EstadoModulo = 'bloqueado' | 'disponible' | 'en_curso' | 'completado';
export type ConQuien = 'consultor' | 'sandra';
export type EstadoSesion = 'agendada' | 'impartida' | 'cancelada' | 'cancelada_tarde';
export type Paso = 'bienvenida' | 'assessment' | 'cv_inicial' | 'resultados' | 'necesidades' | 'sesion_1';
export type Etapa = 'por_aplicar' | 'aplicada' | 'entrevista' | 'oferta';
export type EstadoMeta = 'por_contactar' | 'contacto' | 'entrevista' | 'descartada';

export const FASES: { clave: Fase; nombre: string }[] = [
  { clave: 'reconecta', nombre: 'Reconecta' },
  { clave: 'posicionate', nombre: 'Posiciónate' },
  { clave: 'activa', nombre: 'Activa' },
  { clave: 'concreta', nombre: 'Concreta' },
];

export interface Yo {
  id: string;
  nombre: string;
  correo: string;
  rol: Rol;
  primerIngresoHecho: boolean;
  inscripcion: {
    id: string;
    programa: string;
    vence: string | null;
    consultor: { nombre: string } | null;
    estado: string;
  } | null;
}

export interface Modulo {
  numero: number;
  fase: Fase;
  titulo: string;
  minutos: number | null;
  estado: EstadoModulo;
}

export interface ModuloDetalle extends Modulo {
  lectura: string | null;
  videoUrl: string | null;
  videoExternoUrl: string | null;
  recursos: { id: string; titulo: string; url: string | null }[];
  actividades: { id: string; tipo: 'texto' | 'opcion_multiple' | 'archivo'; pregunta: string; opciones: string[] | null }[];
  respuestas: Record<string, { texto: string | null; opcion: string | null; estado: 'borrador' | 'enviada' | 'revisada'; retro: string | null; retroPor: string | null; retroEn: string | null }>;
}

export interface Sesion {
  id: string;
  con: ConQuien;
  titulo: string;
  iniciaEn: string;
  estado: EstadoSesion;
  anfitrion: string;
  enlace: string | null;
}

export interface Saldo { con: ConQuien; total: number; usadas: number; agendadas: number }

export interface Preparacion {
  pasos: Paso[];
  cvInicial: { etiqueta: string; fecha: string } | null;
  reporteAssessment: boolean;
  necesidades: { momento: string; rol: string; primero: string } | null;
}

export interface Busqueda {
  cvs: { id: string; etiqueta: string; fecha: string; final: boolean; inicial: boolean }[];
  compartirCv: boolean;
  objetivo: { rol: string; funcion: string; ubicacion: string; modalidad: string; nivel: string; sectores: string[] };
  empresas: { id: string; nombre: string; tier: number; contacto: string | null; estado: EstadoMeta }[];
  postulaciones: { id: string; puesto: string; empresa: string; etapa: Etapa }[];
  vacantes: { id: string; puesto: string; empresa: string; ubicacion: string; fuente: string; url: string | null; guardada: boolean }[];
}

export interface Comunidad {
  aceptoReglas: boolean;
  ficha: boolean;
  aprobado: boolean;
  misContactos: number;
  directorioAbierto: boolean;
  miembros: { nombre: string; anterior: string; actual: string; busca: string; linkedin: string | null }[];
  contactos: { empresa: string; nombre: string; puesto: string; sector: string }[];
  headhunters: { firma: string; contacto: string; especialidad: string }[];
}

export interface Articulo { id: string; titulo: string; resumen: string; url: string; fecha: string }
