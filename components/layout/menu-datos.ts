import type { IconName } from '../ui/Icon';

export const MENU: { href: string; label: string; corto: string; icon: IconName; movil?: boolean }[] = [
  { href: '/inicio', label: 'Mi inicio', corto: 'Inicio', icon: 'home', movil: true },
  { href: '/preparacion', label: 'Mi preparación', corto: 'Preparación', icon: 'check' },
  { href: '/programa', label: 'Mi programa', corto: 'Programa', icon: 'book', movil: true },
  { href: '/sesiones', label: 'Mis sesiones', corto: 'Sesiones', icon: 'cal', movil: true },
  { href: '/busqueda', label: 'Mi búsqueda', corto: 'Búsqueda', icon: 'search', movil: true },
  { href: '/comunidad', label: 'Comunidad', corto: 'Comunidad', icon: 'users' },
  { href: '/articulos', label: 'Artículos', corto: 'Artículos', icon: 'doc' },
  { href: '/eventos', label: 'Webinars y eventos', corto: 'Eventos', icon: 'video' },
  { href: '/consultor-virtual', label: 'Consultor virtual', corto: 'Virtual', icon: 'spark' },
];
