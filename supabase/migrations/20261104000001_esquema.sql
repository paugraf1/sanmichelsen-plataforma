-- =====================================================================
-- Executive Transition Academy · Sandra Michelsen
-- 01 · Esquema de la base de datos
-- Roles: participante, consultor, operaciones, admin (Sandra), empresa
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------- Tipos ----------
create type public.rol as enum ('participante','consultor','operaciones','admin','empresa');
create type public.fase as enum ('reconecta','posicionate','activa','concreta');
create type public.estado_modulo as enum ('bloqueado','disponible','en_curso','completado');
create type public.estado_inscripcion as enum ('nuevo','activo','en_entrevistas','recolocado','pausado','inactivo','vencido');
create type public.origen as enum ('individual','empresa');
create type public.con_quien as enum ('consultor','sandra');
create type public.estado_sesion as enum ('agendada','impartida','cancelada','cancelada_tarde');
create type public.estado_respuesta as enum ('borrador','enviada','revisada');
create type public.estado_empresa_meta as enum ('por_contactar','contacto','entrevista','descartada');
create type public.etapa_postulacion as enum ('por_aplicar','aplicada','entrevista','oferta');
create type public.paso_preparacion as enum ('bienvenida','assessment','cv_inicial','resultados','necesidades','sesion_1');
create type public.estado_pago as enum ('pendiente','pagado','fallido','reembolsado');

-- ---------- Personas ----------
create table public.perfiles (
  id uuid primary key references auth.users(id) on delete cascade,
  rol public.rol not null default 'participante',
  nombre text not null default '',
  correo text not null default '',
  telefono text,
  linkedin text,
  puesto_actual text,
  foto_url text,
  primer_ingreso_hecho boolean not null default false,
  acepto_privacidad_en timestamptz,
  acepto_terminos_en timestamptz,
  acepto_compartir_perfil_en timestamptz,
  activo boolean not null default true,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);
comment on table public.perfiles is 'Una fila por usuario. El rol decide qué ve cada quien.';

create table public.empresas_cliente (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  razon_social text,
  rfc text,
  contacto_rh text,
  correo_rh text,
  creado_en timestamptz not null default now()
);

create table public.empresa_usuarios (
  empresa_id uuid not null references public.empresas_cliente(id) on delete cascade,
  perfil_id uuid not null references public.perfiles(id) on delete cascade,
  primary key (empresa_id, perfil_id)
);

create table public.consultores (
  perfil_id uuid primary key references public.perfiles(id) on delete cascade,
  especialidad text,
  semblanza text,
  calendly_url text,
  tarifa_mxn numeric(10,2) not null default 1500,
  activo boolean not null default true,
  vigencia_hasta date
);

-- ---------- Programas ----------
create table public.programas (
  id uuid primary key default gen_random_uuid(),
  clave text unique not null,
  nombre text not null,
  tipo public.origen not null default 'individual',
  descripcion text,
  precio_mxn numeric(10,2),
  sesiones_consultor int not null default 0,
  sesiones_sandra int not null default 0,
  meses_vigencia int not null default 6,
  llamada_arranque boolean not null default true,
  incluye text[] not null default '{}',
  activo boolean not null default true,
  orden int not null default 0
);

create table public.paquetes_sesiones (
  id uuid primary key default gen_random_uuid(),
  cantidad int not null check (cantidad in (1,3,5)),
  con public.con_quien not null,
  precio_mxn numeric(10,2),
  activo boolean not null default true,
  unique (cantidad, con)
);

create table public.inscripciones (
  id uuid primary key default gen_random_uuid(),
  participante_id uuid not null references public.perfiles(id) on delete cascade,
  programa_id uuid not null references public.programas(id),
  consultor_id uuid references public.consultores(perfil_id),
  empresa_id uuid references public.empresas_cliente(id),
  origen public.origen not null default 'individual',
  estado public.estado_inscripcion not null default 'nuevo',
  inicia_en date not null default current_date,
  vence_en date,
  sesiones_consultor int not null default 0,
  sesiones_sandra int not null default 0,
  ultima_actividad_en timestamptz,
  creado_en timestamptz not null default now()
);
create index on public.inscripciones (participante_id);
create index on public.inscripciones (consultor_id);
create index on public.inscripciones (empresa_id);

-- Datos de la compra que solo ven Sandra y el propio participante
create table public.datos_arranque (
  inscripcion_id uuid primary key references public.inscripciones(id) on delete cascade,
  puesto_actual text,
  sueldo_actual_mxn numeric(12,2),
  linkedin text,
  notas_sandra text,
  creado_en timestamptz not null default now()
);

-- ---------- Contenido ----------
create table public.modulos (
  numero smallint primary key check (numero between 1 and 13),
  fase public.fase not null,
  titulo text not null,
  resumen text,
  minutos int,
  publicado boolean not null default true
);

-- Lo que solo se ve cuando el módulo está liberado
create table public.modulo_contenido (
  modulo smallint primary key references public.modulos(numero) on delete cascade,
  lectura text,
  video_url text,
  video_externo_url text
);

create table public.modulo_recursos (
  id uuid primary key default gen_random_uuid(),
  modulo smallint not null references public.modulos(numero) on delete cascade,
  tipo text not null check (tipo in ('pdf','enlace','video','plantilla')),
  titulo text not null,
  url text,
  archivo text,
  orden int not null default 0
);

create table public.actividades (
  id uuid primary key default gen_random_uuid(),
  modulo smallint not null references public.modulos(numero) on delete cascade,
  tipo text not null check (tipo in ('texto','opcion_multiple','archivo')),
  pregunta text not null,
  opciones jsonb,
  orden int not null default 0
);

create table public.avance_modulos (
  inscripcion_id uuid not null references public.inscripciones(id) on delete cascade,
  modulo smallint not null references public.modulos(numero),
  estado public.estado_modulo not null default 'bloqueado',
  liberado_en timestamptz,
  completado_en timestamptz,
  primary key (inscripcion_id, modulo)
);

create table public.respuestas (
  id uuid primary key default gen_random_uuid(),
  inscripcion_id uuid not null references public.inscripciones(id) on delete cascade,
  actividad_id uuid not null references public.actividades(id) on delete cascade,
  texto text,
  opcion text,
  archivo text,
  estado public.estado_respuesta not null default 'borrador',
  enviada_en timestamptz,
  retro text,
  retro_por uuid references public.perfiles(id),
  retro_en timestamptz,
  actualizado_en timestamptz not null default now(),
  unique (inscripcion_id, actividad_id)
);

-- ---------- Mi preparación ----------
create table public.preparacion (
  inscripcion_id uuid not null references public.inscripciones(id) on delete cascade,
  paso public.paso_preparacion not null,
  hecho_en timestamptz not null default now(),
  primary key (inscripcion_id, paso)
);

create table public.necesidades (
  inscripcion_id uuid primary key references public.inscripciones(id) on delete cascade,
  momento text,
  rol_a_explorar text,
  trabajar_primero text,
  enviado_en timestamptz not null default now()
);

create table public.assessments (
  inscripcion_id uuid primary key references public.inscripciones(id) on delete cascade,
  proveedor text not null default 'pyxoom',
  terminado_en timestamptz,
  reporte text,
  subido_por uuid references public.perfiles(id),
  subido_en timestamptz
);

-- ---------- Sesiones ----------
create table public.sesiones (
  id uuid primary key default gen_random_uuid(),
  inscripcion_id uuid not null references public.inscripciones(id) on delete cascade,
  con public.con_quien not null,
  anfitrion_id uuid references public.perfiles(id),
  titulo text not null default 'Sesión',
  inicia_en timestamptz not null,
  estado public.estado_sesion not null default 'agendada',
  enlace_llamada text,
  calendly_evento text unique,
  cancelada_por uuid references public.perfiles(id),
  cancelada_en timestamptz,
  creado_en timestamptz not null default now()
);
create index on public.sesiones (inscripcion_id);
create index on public.sesiones (anfitrion_id, inicia_en);

-- Notas privadas de la sesión: solo consultor, Sandra y admin
create table public.notas_sesion (
  sesion_id uuid primary key references public.sesiones(id) on delete cascade,
  notas text,
  autor_id uuid references public.perfiles(id),
  actualizado_en timestamptz not null default now()
);

-- Sesiones extra: compradas (paquetes) o regaladas/regresadas por operaciones o admin
create table public.creditos_sesion (
  id uuid primary key default gen_random_uuid(),
  inscripcion_id uuid not null references public.inscripciones(id) on delete cascade,
  con public.con_quien not null,
  cantidad int not null check (cantidad <> 0),
  origen text not null check (origen in ('compra','regalo','regreso')),
  motivo text,
  pago_id uuid,
  otorgado_por uuid references public.perfiles(id),
  creado_en timestamptz not null default now()
);

-- ---------- Mi búsqueda ----------
create table public.cv_versiones (
  id uuid primary key default gen_random_uuid(),
  inscripcion_id uuid not null references public.inscripciones(id) on delete cascade,
  etiqueta text not null,
  archivo text not null,
  es_final boolean not null default false,
  es_inicial boolean not null default false,
  subido_por uuid references public.perfiles(id),
  creado_en timestamptz not null default now()
);

create table public.perfil_objetivo (
  inscripcion_id uuid primary key references public.inscripciones(id) on delete cascade,
  rol text,
  funcion text,
  ubicacion text,
  modalidad text,
  nivel text,
  sectores text[] not null default '{}',
  actualizado_en timestamptz not null default now(),
  constraint max_4_sectores check (cardinality(sectores) <= 4)
);

create table public.empresas_meta (
  id uuid primary key default gen_random_uuid(),
  inscripcion_id uuid not null references public.inscripciones(id) on delete cascade,
  nombre text not null,
  tier smallint not null default 2 check (tier between 1 and 3),
  sector text,
  contacto_clave text,
  estado public.estado_empresa_meta not null default 'por_contactar',
  estado_actualizado_por uuid references public.perfiles(id),
  notas text,
  creado_en timestamptz not null default now()
);
create index on public.empresas_meta (inscripcion_id);

create table public.postulaciones (
  id uuid primary key default gen_random_uuid(),
  inscripcion_id uuid not null references public.inscripciones(id) on delete cascade,
  puesto text not null,
  empresa text not null,
  etapa public.etapa_postulacion not null default 'por_aplicar',
  contacto text,
  fecha_evento date,
  notas text,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create table public.vacantes_sugeridas (
  id uuid primary key default gen_random_uuid(),
  inscripcion_id uuid not null references public.inscripciones(id) on delete cascade,
  puesto text not null,
  empresa text,
  ubicacion text,
  fuente text,
  url text,
  guardada boolean not null default false,
  encontrada_en timestamptz not null default now()
);

-- ---------- Comunidad Elite Titans ----------
create table public.comunidad_miembros (
  perfil_id uuid primary key references public.perfiles(id) on delete cascade,
  nombre text not null,
  empresa_puesto_anterior text,
  empresa_actual text,
  puesto_buscado text,
  linkedin text,
  telefono text,
  correo text,
  cumpleanos text,
  contacto_chro text,
  aprobado boolean not null default false,
  acepto_reglas_en timestamptz,
  creado_en timestamptz not null default now()
);

create table public.contactos_estrategicos (
  id uuid primary key default gen_random_uuid(),
  agregado_por uuid references public.perfiles(id) on delete set null,
  empresa text not null,
  nombre text,
  puesto text not null,
  sector text,
  correo text,
  celular text,
  linkedin text,
  creado_en timestamptz not null default now()
);

create table public.headhunters (
  id uuid primary key default gen_random_uuid(),
  firma text not null,
  contacto text,
  especialidad text,
  correo text,
  telefono text,
  linkedin_contacto text,
  linkedin_firma text,
  sitio_web text
);

-- ---------- Artículos, eventos y avisos ----------
create table public.articulos (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  resumen text,
  url text not null,
  publicado_en date not null default current_date,
  visible boolean not null default true
);

create table public.eventos (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  tipo text not null default 'webinar',
  inicia_en timestamptz,
  enlace text,
  visible boolean not null default false
);

create table public.notificaciones (
  id uuid primary key default gen_random_uuid(),
  perfil_id uuid not null references public.perfiles(id) on delete cascade,
  titulo text not null,
  enlace text,
  leida_en timestamptz,
  creado_en timestamptz not null default now()
);
create index on public.notificaciones (perfil_id, creado_en desc);

-- ---------- Pagos ----------
create table public.cupones (
  codigo text primary key,
  porcentaje int check (porcentaje between 1 and 100),
  vence_en date,
  usos_max int,
  usos int not null default 0,
  activo boolean not null default true
);

create table public.pagos (
  id uuid primary key default gen_random_uuid(),
  perfil_id uuid references public.perfiles(id) on delete set null,
  inscripcion_id uuid references public.inscripciones(id) on delete set null,
  concepto text not null check (concepto in ('programa','sesiones','extension')),
  programa_id uuid references public.programas(id),
  paquete_id uuid references public.paquetes_sesiones(id),
  monto_mxn numeric(12,2) not null,
  metodo text check (metodo in ('tarjeta','spei','transferencia')),
  cupon text references public.cupones(codigo),
  estado public.estado_pago not null default 'pendiente',
  stripe_id text unique,
  factura_solicitada boolean not null default false,
  creado_en timestamptz not null default now()
);

alter table public.creditos_sesion
  add constraint creditos_pago_fk foreign key (pago_id) references public.pagos(id) on delete set null;

create table public.pagos_consultor (
  sesion_id uuid primary key references public.sesiones(id) on delete cascade,
  monto_mxn numeric(10,2) not null,
  pagado boolean not null default false,
  factura text,
  pagado_en timestamptz
);

-- ---------- Vistas ----------
-- Contador de sesiones por inscripción: lo incluido en el programa + créditos − usadas
create view public.saldo_sesiones with (security_invoker = true) as
select i.id as inscripcion_id,
       c.con,
       (case when c.con = 'consultor' then i.sesiones_consultor else i.sesiones_sandra end)
         + coalesce((select sum(cr.cantidad) from public.creditos_sesion cr where cr.inscripcion_id = i.id and cr.con = c.con), 0) as total,
       (select count(*) from public.sesiones s where s.inscripcion_id = i.id and s.con = c.con and s.estado in ('impartida','cancelada_tarde')) as usadas,
       (select count(*) from public.sesiones s where s.inscripcion_id = i.id and s.con = c.con and s.estado = 'agendada') as agendadas
from public.inscripciones i
cross join (values ('consultor'::public.con_quien), ('sandra'::public.con_quien)) as c(con);

create view public.avance_inscripcion with (security_invoker = true) as
select i.id as inscripcion_id,
       count(*) filter (where a.estado = 'completado') as modulos_completados,
       count(*) filter (where a.estado <> 'bloqueado') as modulos_liberados,
       round(100.0 * count(*) filter (where a.estado = 'completado') / 13) as porcentaje
from public.inscripciones i
left join public.avance_modulos a on a.inscripcion_id = i.id
group by i.id;

-- ---------- Tiempos de actualización ----------
create function public.tocar_actualizado() returns trigger language plpgsql as $$
begin new.actualizado_en := now(); return new; end $$;
create trigger t_perfiles before update on public.perfiles for each row execute function public.tocar_actualizado();
create trigger t_respuestas before update on public.respuestas for each row execute function public.tocar_actualizado();
create trigger t_postulaciones before update on public.postulaciones for each row execute function public.tocar_actualizado();
create trigger t_perfil_objetivo before update on public.perfil_objetivo for each row execute function public.tocar_actualizado();
