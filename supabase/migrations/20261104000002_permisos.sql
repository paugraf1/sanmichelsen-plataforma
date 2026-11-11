-- =====================================================================
-- 02 · Permisos por rol (Row Level Security) y reglas del programa
-- Cada quien ve solo lo suyo:
--   participante → solo lo suyo
--   consultor    → solo sus participantes (incluye notas privadas)
--   operaciones  → todos los participantes, sin notas privadas ni sueldo
--   admin        → todo
--   empresa      → avance y sesiones de su gente, nunca contenido privado
-- =====================================================================

-- ---------- Funciones de apoyo ----------
-- true cuando escribe el servidor (service role), una migración o una función de este archivo.
-- OJO: las funciones security definer corren como postgres y se saltan los candados;
-- por eso solo deben escribir columnas fijas, nunca valores que mande el usuario sin validar.
create or replace function public.es_servicio() returns boolean
language sql stable as $$
  select current_user in ('postgres','service_role','supabase_admin')
$$;

create or replace function public.mi_rol() returns public.rol
language sql stable security definer set search_path = public as $$
  select rol from public.perfiles where id = auth.uid() and activo
$$;

create or replace function public.es_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.mi_rol() = 'admin', false)
$$;

create or replace function public.es_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.mi_rol() in ('operaciones','admin'), false)
$$;

-- Ver el registro "público" de una inscripción (avance, sesiones, estado)
create or replace function public.puede_ver_inscripcion(insc uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.inscripciones i
    where i.id = insc and (
      public.es_staff()
      or i.participante_id = auth.uid()
      or i.consultor_id = auth.uid()
      or (public.mi_rol() = 'empresa' and i.empresa_id in (select empresa_id from public.empresa_usuarios where perfil_id = auth.uid()))
    )
  )
$$;

-- Ver contenido privado (respuestas, CV, búsqueda): participante, su consultor y staff. Nunca la empresa.
create or replace function public.puede_ver_privado(insc uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.inscripciones i
    where i.id = insc and (public.es_staff() or i.participante_id = auth.uid() or i.consultor_id = auth.uid())
  )
$$;

create or replace function public.es_mia(insc uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.inscripciones i where i.id = insc and i.participante_id = auth.uid())
$$;

create or replace function public.soy_su_consultor(insc uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.inscripciones i where i.id = insc and i.consultor_id = auth.uid())
$$;

create or replace function public.tengo_programa_activo() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.inscripciones i
    where i.participante_id = auth.uid()
      and i.estado in ('nuevo','activo','en_entrevistas')
      and (i.vence_en is null or i.vence_en >= current_date)
  )
$$;

-- Directorios de la comunidad: con programa activo, reglas aceptadas y 5 contactos compartidos
create or replace function public.contactos_que_agregue() returns int
language sql stable security definer set search_path = public as $$
  select count(*)::int from public.contactos_estrategicos where agregado_por = auth.uid()
$$;

create or replace function public.puede_ver_directorio() returns boolean
language sql stable security definer set search_path = public as $$
  select public.es_staff()
    or coalesce(public.mi_rol() = 'consultor', false)
    or (
      public.tengo_programa_activo()
      and exists (select 1 from public.comunidad_miembros m where m.perfil_id = auth.uid() and m.acepto_reglas_en is not null)
      and public.contactos_que_agregue() >= 5
    )
$$;

-- El módulo está liberado para mí
create or replace function public.puedo_ver_modulo(num smallint) returns boolean
language sql stable security definer set search_path = public as $$
  select public.es_staff()
    or coalesce(public.mi_rol() = 'consultor', false)
    or exists (
      select 1 from public.avance_modulos a join public.inscripciones i on i.id = a.inscripcion_id
      where a.modulo = num and a.estado <> 'bloqueado' and i.participante_id = auth.uid()
    )
$$;

-- ---------- Alta automática del perfil al registrarse ----------
create or replace function public.nuevo_usuario() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.perfiles (id, nombre, correo, foto_url)
  values (new.id,
          coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
          coalesce(new.email, ''),
          new.raw_user_meta_data->>'avatar_url')
  on conflict (id) do nothing;
  return new;
end $$;
create trigger al_crear_usuario after insert on auth.users for each row execute function public.nuevo_usuario();

-- ---------- Candados ----------
-- Solo admin cambia el rol o desactiva una cuenta
create or replace function public.candado_perfil() returns trigger
language plpgsql set search_path = public as $$
begin
  if public.es_servicio() or public.es_admin() then return new; end if;
  if new.id is distinct from old.id then raise exception 'No se puede cambiar el id de un perfil'; end if;
  if new.rol is distinct from old.rol or new.activo is distinct from old.activo then
    raise exception 'Solo admin puede cambiar el rol o desactivar una cuenta';
  end if;
  if new.primer_ingreso_hecho is distinct from old.primer_ingreso_hecho
     or new.acepto_privacidad_en is distinct from old.acepto_privacidad_en
     or new.acepto_terminos_en is distinct from old.acepto_terminos_en
     or new.acepto_compartir_perfil_en is distinct from old.acepto_compartir_perfil_en then
    raise exception 'Las aceptaciones se registran desde el primer ingreso';
  end if;
  return new;
end $$;
create trigger candado_perfil before update on public.perfiles for each row execute function public.candado_perfil();

-- El estatus de las empresas meta lo mueven operaciones y admin; el participante solo lo ve
create or replace function public.candado_empresa_meta() returns trigger
language plpgsql set search_path = public as $$
begin
  if public.es_servicio() or public.es_staff() then
    if tg_op = 'UPDATE' and new.estado is distinct from old.estado then new.estado_actualizado_por := auth.uid(); end if;
    return new;
  end if;
  if tg_op = 'INSERT' then new.estado := 'por_contactar'; new.estado_actualizado_por := null; end if;
  if tg_op = 'UPDATE' then new.estado_actualizado_por := old.estado_actualizado_por; new.inscripcion_id := old.inscripcion_id; end if;
  if tg_op = 'UPDATE' and new.estado is distinct from old.estado then
    raise exception 'El estatus lo actualiza el equipo de Sandra';
  end if;
  return new;
end $$;
create trigger candado_empresa_meta before insert or update on public.empresas_meta for each row execute function public.candado_empresa_meta();

-- Máximo 50 empresas meta
create or replace function public.max_empresas_meta() returns trigger
language plpgsql set search_path = public as $$
begin
  if (select count(*) from public.empresas_meta where inscripcion_id = new.inscripcion_id) >= 50 then
    raise exception 'Ya tienes 50 empresas meta';
  end if;
  return new;
end $$;
create trigger max_empresas_meta before insert on public.empresas_meta for each row execute function public.max_empresas_meta();

-- La aprobación en el directorio la da el equipo
create or replace function public.candado_miembro() returns trigger
language plpgsql set search_path = public as $$
begin
  if public.es_servicio() or public.es_staff() then return new; end if;
  if tg_op = 'INSERT' then new.aprobado := false; end if;
  if tg_op = 'UPDATE' then new.aprobado := old.aprobado; end if;
  return new;
end $$;
create trigger candado_miembro before insert or update on public.comunidad_miembros for each row execute function public.candado_miembro();

-- Una respuesta enviada ya no la cambia el participante; la retroalimentación solo la da su consultor o staff
create or replace function public.candado_respuesta() returns trigger
language plpgsql set search_path = public as $$
begin
  if public.es_servicio() then return new; end if;
  if tg_op = 'UPDATE' and (new.inscripcion_id is distinct from old.inscripcion_id or new.actividad_id is distinct from old.actividad_id) and not public.es_admin() then
    raise exception 'No se puede mover una respuesta';
  end if;
  if public.es_mia(new.inscripcion_id) and not public.es_staff() then
    if tg_op = 'UPDATE' and old.estado <> 'borrador' then raise exception 'La actividad ya se envió a revisión'; end if;
    if new.estado not in ('borrador','enviada') then raise exception 'Estado no permitido'; end if;
    if new.estado = 'enviada' then new.enviada_en := now(); end if;
    new.retro := case when tg_op = 'UPDATE' then old.retro else null end;
    new.retro_por := case when tg_op = 'UPDATE' then old.retro_por else null end;
    new.retro_en := case when tg_op = 'UPDATE' then old.retro_en else null end;
    return new;
  end if;
  if tg_op = 'INSERT' and public.es_staff() then return new; end if;
  if new.archivo is not null and new.archivo not like new.inscripcion_id::text || '/%' then raise exception 'Archivo fuera de tu carpeta'; end if;
  if tg_op = 'UPDATE' and (public.soy_su_consultor(new.inscripcion_id) or public.es_staff()) then
    new.texto := old.texto; new.opcion := old.opcion; new.archivo := old.archivo; new.enviada_en := old.enviada_en;
    if new.retro is distinct from old.retro then
      new.retro_por := auth.uid(); new.retro_en := now(); new.estado := 'revisada';
    else
      new.estado := old.estado; new.retro_por := old.retro_por; new.retro_en := old.retro_en;
    end if;
    return new;
  end if;
  raise exception 'Sin permiso';
end $$;
create trigger candado_respuesta before insert or update on public.respuestas for each row execute function public.candado_respuesta();

-- Sesiones: primero 2 con el consultor antes de la de Sandra, y no agendar más de las disponibles
create or replace function public.saldo(insc uuid, quien public.con_quien) returns int
language sql stable security definer set search_path = public as $$
  select (total - usadas - agendadas)::int from public.saldo_sesiones
  where inscripcion_id = insc and con = quien and public.puede_ver_inscripcion(insc)
$$;

create or replace function public.regla_sesiones() returns trigger
language plpgsql set search_path = public as $$
begin
  if public.es_servicio() or public.es_staff() then return new; end if;
  if not public.es_mia(new.inscripcion_id) then raise exception 'Sin permiso'; end if;
  if new.estado <> 'agendada' then raise exception 'Solo puedes agendar'; end if;
  if new.inicia_en < now() then raise exception 'La fecha ya pasó'; end if;
  -- El anfitrión lo pone el sistema: su consultor o Sandra (admin)
  new.anfitrion_id := case when new.con = 'consultor'
    then (select consultor_id from public.inscripciones where id = new.inscripcion_id)
    else (select id from public.perfiles where rol = 'admin' and activo order by creado_en limit 1) end;
  new.calendly_evento := null; new.cancelada_por := null; new.cancelada_en := null;
  if public.saldo(new.inscripcion_id, new.con) < 1 then
    raise exception 'Ya no tienes sesiones disponibles. Puedes sumar un paquete desde Mis sesiones.';
  end if;
  if new.con = 'sandra' and (select count(*) from public.sesiones s where s.inscripcion_id = new.inscripcion_id and s.con = 'consultor' and s.estado in ('impartida','cancelada_tarde')) < 2 then
    raise exception 'Tu sesión con Sandra se abre después de 2 sesiones con tu consultor';
  end if;
  return new;
end $$;
create trigger regla_sesiones before insert on public.sesiones for each row execute function public.regla_sesiones();

-- Cambios a una sesión ya creada: solo su consultor (registrar) o staff; el participante solo con las funciones
create or replace function public.candado_sesion() returns trigger
language plpgsql set search_path = public as $$
begin
  if public.es_servicio() or public.es_staff() then return new; end if;
  if not public.soy_su_consultor(old.inscripcion_id) then raise exception 'Sin permiso'; end if;
  if old.con = 'sandra' then raise exception 'Las sesiones con Sandra las registra Sandra o operaciones'; end if;
  if new.inicia_en is distinct from old.inicia_en or new.cancelada_por is distinct from old.cancelada_por or new.cancelada_en is distinct from old.cancelada_en then
    raise exception 'Para mover o cancelar una sesión usa la agenda';
  end if;
  if new.estado = 'cancelada_tarde' and old.estado <> 'cancelada_tarde' and old.inicia_en - now() > interval '24 hours' then
    raise exception 'Solo cuenta como cancelada tarde con menos de 24 h';
  end if;
  if new.inscripcion_id is distinct from old.inscripcion_id or new.con is distinct from old.con
     or new.anfitrion_id is distinct from old.anfitrion_id or new.calendly_evento is distinct from old.calendly_evento then
    raise exception 'Solo operaciones puede mover una sesión';
  end if;
  if new.estado is distinct from old.estado and not (old.estado = 'agendada' and new.estado in ('impartida','cancelada_tarde')) then
    raise exception 'Cambio de estado no permitido';
  end if;
  return new;
end $$;
create trigger candado_sesion before update on public.sesiones for each row execute function public.candado_sesion();

-- Nadie cambia de dueño una inscripción, salvo admin
create or replace function public.candado_inscripcion() returns trigger
language plpgsql set search_path = public as $$
begin
  if public.es_servicio() or public.es_admin() then return new; end if;
  if new.participante_id is distinct from old.participante_id then
    raise exception 'Solo admin puede cambiar a quién pertenece una inscripción';
  end if;
  return new;
end $$;
create trigger candado_inscripcion before update on public.inscripciones for each row execute function public.candado_inscripcion();

-- El consultor edita su semblanza y su Calendly, no su tarifa ni su vigencia
create or replace function public.candado_consultor() returns trigger
language plpgsql set search_path = public as $$
begin
  if public.es_servicio() or public.es_admin() then return new; end if;
  if new.tarifa_mxn is distinct from old.tarifa_mxn or new.activo is distinct from old.activo
     or new.vigencia_hasta is distinct from old.vigencia_hasta or new.perfil_id is distinct from old.perfil_id then
    raise exception 'La tarifa y la vigencia las cambia admin';
  end if;
  return new;
end $$;
create trigger candado_consultor before update on public.consultores for each row execute function public.candado_consultor();

-- Un CV no cambia de participante y siempre queda quién lo subió
create or replace function public.candado_cv() returns trigger
language plpgsql set search_path = public as $$
begin
  if public.es_servicio() then return new; end if;
  if new.archivo not like new.inscripcion_id::text || '/%' then raise exception 'Archivo fuera de la carpeta del participante'; end if;
  if tg_op = 'INSERT' then new.subido_por := auth.uid(); return new; end if;
  if (new.inscripcion_id is distinct from old.inscripcion_id) and not public.es_admin() then raise exception 'No se puede mover un CV'; end if;
  new.subido_por := old.subido_por;
  return new;
end $$;
create trigger candado_cv before insert or update on public.cv_versiones for each row execute function public.candado_cv();

-- De una vacante sugerida el participante solo cambia "guardada"
create or replace function public.candado_vacante() returns trigger
language plpgsql set search_path = public as $$
declare g boolean := new.guardada;
begin
  if public.es_servicio() or public.es_staff() then return new; end if;
  new := old; new.guardada := g;
  return new;
end $$;
create trigger candado_vacante before update on public.vacantes_sugeridas for each row execute function public.candado_vacante();

-- Una postulación no cambia de participante
create or replace function public.candado_postulacion() returns trigger
language plpgsql set search_path = public as $$
begin
  if public.es_servicio() or public.es_admin() then return new; end if;
  if new.inscripcion_id is distinct from old.inscripcion_id then raise exception 'No se puede mover una postulación'; end if;
  return new;
end $$;
create trigger candado_postulacion before update on public.postulaciones for each row execute function public.candado_postulacion();

-- ---------- Acciones (se llaman desde la plataforma) ----------
create or replace function public.completar_primer_ingreso(compartir_perfil boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not compartir_perfil then raise exception 'Para el programa necesitamos compartir tu perfil profesional con contactos estratégicos'; end if;
  update public.perfiles set primer_ingreso_hecho = true,
    acepto_privacidad_en = coalesce(acepto_privacidad_en, now()),
    acepto_terminos_en = coalesce(acepto_terminos_en, now()),
    acepto_compartir_perfil_en = coalesce(acepto_compartir_perfil_en, now())
  where id = auth.uid();
end $$;

create or replace function public.marcar_paso(insc uuid, p public.paso_preparacion) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not (public.es_mia(insc) or public.es_staff()) then raise exception 'Sin permiso'; end if;
  if p = 'resultados' and not public.es_staff() then raise exception 'Los resultados los sube el equipo'; end if;
  insert into public.preparacion (inscripcion_id, paso) values (insc, p) on conflict do nothing;
  if p = 'assessment' then
    insert into public.assessments (inscripcion_id, terminado_en) values (insc, now())
    on conflict (inscripcion_id) do update set terminado_en = coalesce(public.assessments.terminado_en, now());
  end if;
  update public.inscripciones set ultima_actividad_en = now() where id = insc;
end $$;

create or replace function public.completar_modulo(insc uuid, num smallint) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.es_mia(insc) then raise exception 'Sin permiso'; end if;
  update public.avance_modulos set estado = 'completado', completado_en = now()
  where inscripcion_id = insc and modulo = num and estado in ('disponible','en_curso');
  if not found then raise exception 'Este módulo no está disponible'; end if;
  update public.inscripciones set ultima_actividad_en = now() where id = insc;
end $$;

create or replace function public.empezar_modulo(insc uuid, num smallint) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.es_mia(insc) then raise exception 'Sin permiso'; end if;
  update public.avance_modulos set estado = 'en_curso' where inscripcion_id = insc and modulo = num and estado = 'disponible';
  update public.inscripciones set ultima_actividad_en = now() where id = insc;
end $$;

-- Sandra (admin) o operaciones liberan o bloquean módulos por persona
create or replace function public.liberar_modulo(insc uuid, num smallint, abrir boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.es_staff() then raise exception 'Sin permiso'; end if;
  insert into public.avance_modulos (inscripcion_id, modulo, estado, liberado_en)
  values (insc, num, case when abrir then 'disponible'::public.estado_modulo else 'bloqueado'::public.estado_modulo end, case when abrir then now() end)
  on conflict (inscripcion_id, modulo) do update
    set estado = case when public.avance_modulos.estado = 'completado' then 'completado'::public.estado_modulo
                      when abrir then 'disponible'::public.estado_modulo else 'bloqueado'::public.estado_modulo end,
        liberado_en = case when abrir then coalesce(public.avance_modulos.liberado_en, now()) else null end;
end $$;

-- Dar o regresar una sesión (emergencias, cortesía)
create or replace function public.dar_sesion(insc uuid, quien public.con_quien, motivo text, regreso boolean default false) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.es_staff() then raise exception 'Sin permiso'; end if;
  insert into public.creditos_sesion (inscripcion_id, con, cantidad, origen, motivo, otorgado_por)
  values (insc, quien, 1, case when regreso then 'regreso' else 'regalo' end, motivo, auth.uid());
end $$;

-- Cancelar: el participante solo con más de 24 h; operaciones y admin siempre
create or replace function public.cancelar_sesion(sid uuid, con_menos_de_24h boolean default null) returns public.estado_sesion
language plpgsql security definer set search_path = public as $$
declare s public.sesiones; tarde boolean;
begin
  select * into s from public.sesiones where id = sid;
  if not found or s.estado <> 'agendada' then raise exception 'La sesión no está agendada'; end if;
  tarde := s.inicia_en - now() < interval '24 hours';
  if public.es_staff() then
    tarde := coalesce(con_menos_de_24h, tarde);
  elsif public.es_mia(s.inscripcion_id) then
    if tarde then raise exception 'Con menos de 24 h la sesión cuenta como impartida. Escríbenos si es una emergencia.'; end if;
  else
    raise exception 'Sin permiso';
  end if;
  update public.sesiones set estado = case when tarde then 'cancelada_tarde'::public.estado_sesion else 'cancelada' end,
    cancelada_por = auth.uid(), cancelada_en = now() where id = sid;
  return case when tarde then 'cancelada_tarde'::public.estado_sesion else 'cancelada' end;
end $$;

create or replace function public.reagendar_sesion(sid uuid, nueva timestamptz) returns void
language plpgsql security definer set search_path = public as $$
declare s public.sesiones;
begin
  select * into s from public.sesiones where id = sid;
  if not found or s.estado <> 'agendada' then raise exception 'La sesión no está agendada'; end if;
  if not public.es_staff() then
    if not public.es_mia(s.inscripcion_id) then raise exception 'Sin permiso'; end if;
    if s.inicia_en - now() < interval '24 hours' then raise exception 'Ya no se puede reagendar: faltan menos de 24 h'; end if;
  end if;
  if nueva < now() then raise exception 'La nueva fecha ya pasó'; end if;
  update public.sesiones set inicia_en = nueva where id = sid;
end $$;

create or replace function public.aceptar_reglas() returns void
language plpgsql security definer set search_path = public as $$
declare p public.perfiles;
begin
  if not public.tengo_programa_activo() then raise exception 'La comunidad es para participantes con programa activo'; end if;
  select * into p from public.perfiles where id = auth.uid();
  insert into public.comunidad_miembros (perfil_id, nombre, correo, linkedin, acepto_reglas_en)
  values (p.id, p.nombre, p.correo, p.linkedin, now())
  on conflict (perfil_id) do update set acepto_reglas_en = coalesce(public.comunidad_miembros.acepto_reglas_en, now());
end $$;

-- ---------- Activar RLS en todas las tablas ----------
do $$ declare t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- ---------- Políticas ----------
-- perfiles
create policy perfiles_ver on public.perfiles for select to authenticated using (
  id = auth.uid() or public.es_staff() or rol in ('consultor','admin')
  or exists (select 1 from public.inscripciones i where i.participante_id = perfiles.id and public.puede_ver_inscripcion(i.id))
);
create policy perfiles_editar_propio on public.perfiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy perfiles_staff on public.perfiles for update to authenticated using (public.es_staff()) with check (public.es_staff());
create policy perfiles_admin on public.perfiles for all to authenticated using (public.es_admin()) with check (public.es_admin());

-- empresas
create policy empresas_ver on public.empresas_cliente for select to authenticated using (
  public.es_staff() or id in (select empresa_id from public.empresa_usuarios where perfil_id = auth.uid())
);
create policy empresas_staff on public.empresas_cliente for all to authenticated using (public.es_staff()) with check (public.es_staff());
create policy empresa_usuarios_ver on public.empresa_usuarios for select to authenticated using (perfil_id = auth.uid() or public.es_staff());
create policy empresa_usuarios_staff on public.empresa_usuarios for all to authenticated using (public.es_staff()) with check (public.es_staff());

-- consultores
create policy consultores_ver on public.consultores for select to authenticated using (true);
create policy consultores_propio on public.consultores for update to authenticated using (perfil_id = auth.uid()) with check (perfil_id = auth.uid());
create policy consultores_admin on public.consultores for all to authenticated using (public.es_admin()) with check (public.es_admin());

-- programas (se ven en la landing sin sesión); los paquetes de sesiones extra solo dentro de la plataforma
create policy programas_ver_publico on public.programas for select to anon using (activo);
create policy programas_ver on public.programas for select to authenticated using (activo or public.es_admin());
create policy programas_admin on public.programas for all to authenticated using (public.es_admin()) with check (public.es_admin());
create policy paquetes_ver on public.paquetes_sesiones for select to authenticated using (activo or public.es_admin());
create policy paquetes_admin on public.paquetes_sesiones for all to authenticated using (public.es_admin()) with check (public.es_admin());

-- inscripciones
create policy inscripciones_ver on public.inscripciones for select to authenticated using (public.puede_ver_inscripcion(id));
create policy inscripciones_staff on public.inscripciones for all to authenticated using (public.es_staff()) with check (public.es_staff());

-- datos de arranque (sueldo): solo Sandra y el propio participante
create policy arranque_ver on public.datos_arranque for select to authenticated using (public.es_admin() or public.es_mia(inscripcion_id));
create policy arranque_propio on public.datos_arranque for insert to authenticated with check (public.es_mia(inscripcion_id));
create policy arranque_admin on public.datos_arranque for all to authenticated using (public.es_admin()) with check (public.es_admin());

-- contenido
create policy modulos_ver on public.modulos for select to authenticated using (publicado or public.es_admin());
create policy modulos_admin on public.modulos for all to authenticated using (public.es_admin()) with check (public.es_admin());
create policy contenido_ver on public.modulo_contenido for select to authenticated using (public.puedo_ver_modulo(modulo));
create policy contenido_admin on public.modulo_contenido for all to authenticated using (public.es_admin()) with check (public.es_admin());
create policy recursos_ver on public.modulo_recursos for select to authenticated using (public.puedo_ver_modulo(modulo));
create policy recursos_admin on public.modulo_recursos for all to authenticated using (public.es_admin()) with check (public.es_admin());
create policy actividades_ver on public.actividades for select to authenticated using (public.puedo_ver_modulo(modulo));
create policy actividades_admin on public.actividades for all to authenticated using (public.es_admin()) with check (public.es_admin());

create policy avance_ver on public.avance_modulos for select to authenticated using (public.puede_ver_inscripcion(inscripcion_id));
create policy avance_staff on public.avance_modulos for all to authenticated using (public.es_staff()) with check (public.es_staff());

create policy respuestas_ver on public.respuestas for select to authenticated using (public.puede_ver_privado(inscripcion_id));
create policy respuestas_crear on public.respuestas for insert to authenticated with check (public.es_mia(inscripcion_id) or public.es_staff());
create policy respuestas_editar on public.respuestas for update to authenticated using (public.puede_ver_privado(inscripcion_id)) with check (public.puede_ver_privado(inscripcion_id));

-- preparación
create policy prep_ver on public.preparacion for select to authenticated using (public.puede_ver_privado(inscripcion_id));
create policy prep_staff on public.preparacion for all to authenticated using (public.es_staff()) with check (public.es_staff());
create policy necesidades_ver on public.necesidades for select to authenticated using (public.puede_ver_privado(inscripcion_id));
create policy necesidades_propio on public.necesidades for insert to authenticated with check (public.es_mia(inscripcion_id));
create policy necesidades_propio_upd on public.necesidades for update to authenticated using (public.es_mia(inscripcion_id)) with check (public.es_mia(inscripcion_id));
create policy assessment_ver on public.assessments for select to authenticated using (public.puede_ver_privado(inscripcion_id));
create policy assessment_staff on public.assessments for all to authenticated using (public.es_staff()) with check (public.es_staff());

-- sesiones
create policy sesiones_ver on public.sesiones for select to authenticated using (public.puede_ver_inscripcion(inscripcion_id));
create policy sesiones_agendar on public.sesiones for insert to authenticated with check (public.es_mia(inscripcion_id) or public.es_staff());
create policy sesiones_registrar on public.sesiones for update to authenticated using (public.soy_su_consultor(inscripcion_id) or public.es_staff()) with check (public.soy_su_consultor(inscripcion_id) or public.es_staff());
create policy sesiones_staff_borrar on public.sesiones for delete to authenticated using (public.es_staff());

create policy notas_ver on public.notas_sesion for select to authenticated using (
  public.es_admin() or exists (select 1 from public.sesiones s where s.id = sesion_id and public.soy_su_consultor(s.inscripcion_id))
);
create policy notas_escribir on public.notas_sesion for all to authenticated using (
  public.es_admin() or exists (select 1 from public.sesiones s where s.id = sesion_id and public.soy_su_consultor(s.inscripcion_id))
) with check (
  public.es_admin() or exists (select 1 from public.sesiones s where s.id = sesion_id and public.soy_su_consultor(s.inscripcion_id))
);

create policy creditos_ver on public.creditos_sesion for select to authenticated using (public.puede_ver_inscripcion(inscripcion_id));
create policy creditos_staff on public.creditos_sesion for all to authenticated using (public.es_staff()) with check (public.es_staff());

-- búsqueda (privado: nunca lo ve la empresa)
create policy cv_ver on public.cv_versiones for select to authenticated using (public.puede_ver_privado(inscripcion_id));
create policy cv_subir on public.cv_versiones for insert to authenticated with check (public.puede_ver_privado(inscripcion_id));
create policy cv_editar on public.cv_versiones for update to authenticated using (public.puede_ver_privado(inscripcion_id)) with check (public.puede_ver_privado(inscripcion_id));

create policy objetivo_ver on public.perfil_objetivo for select to authenticated using (public.puede_ver_privado(inscripcion_id));
create policy objetivo_crear on public.perfil_objetivo for insert to authenticated with check (public.puede_ver_privado(inscripcion_id));
create policy objetivo_editar on public.perfil_objetivo for update to authenticated using (public.puede_ver_privado(inscripcion_id)) with check (public.puede_ver_privado(inscripcion_id));

create policy meta_ver on public.empresas_meta for select to authenticated using (public.puede_ver_privado(inscripcion_id));
create policy meta_crear on public.empresas_meta for insert to authenticated with check (public.es_mia(inscripcion_id) or public.es_staff());
create policy meta_editar on public.empresas_meta for update to authenticated using (public.es_mia(inscripcion_id) or public.es_staff()) with check (public.es_mia(inscripcion_id) or public.es_staff());
create policy meta_borrar on public.empresas_meta for delete to authenticated using (public.es_mia(inscripcion_id) or public.es_staff());

create policy post_ver on public.postulaciones for select to authenticated using (public.puede_ver_privado(inscripcion_id));
create policy post_escribir on public.postulaciones for all to authenticated using (public.puede_ver_privado(inscripcion_id)) with check (public.puede_ver_privado(inscripcion_id));

create policy vac_ver on public.vacantes_sugeridas for select to authenticated using (public.puede_ver_privado(inscripcion_id));
create policy vac_guardar on public.vacantes_sugeridas for update to authenticated using (public.es_mia(inscripcion_id)) with check (public.es_mia(inscripcion_id));
create policy vac_staff on public.vacantes_sugeridas for all to authenticated using (public.es_staff()) with check (public.es_staff());

-- comunidad
create policy miembros_ver on public.comunidad_miembros for select to authenticated using (
  perfil_id = auth.uid() or public.es_staff() or (aprobado and public.puede_ver_directorio())
);
create policy miembros_propio on public.comunidad_miembros for insert to authenticated with check (perfil_id = auth.uid() and public.tengo_programa_activo());
create policy miembros_propio_upd on public.comunidad_miembros for update to authenticated using (perfil_id = auth.uid()) with check (perfil_id = auth.uid());
create policy miembros_staff on public.comunidad_miembros for all to authenticated using (public.es_staff()) with check (public.es_staff());

create policy contactos_ver on public.contactos_estrategicos for select to authenticated using (agregado_por = auth.uid() or public.puede_ver_directorio());
create policy contactos_agregar on public.contactos_estrategicos for insert to authenticated with check (agregado_por = auth.uid() and public.tengo_programa_activo());
create policy contactos_propio on public.contactos_estrategicos for update to authenticated using (agregado_por = auth.uid()) with check (agregado_por = auth.uid());
create policy contactos_staff on public.contactos_estrategicos for all to authenticated using (public.es_staff()) with check (public.es_staff());

create policy hh_ver on public.headhunters for select to authenticated using (public.puede_ver_directorio());
create policy hh_staff on public.headhunters for all to authenticated using (public.es_staff()) with check (public.es_staff());

-- artículos, eventos, avisos
create policy art_ver on public.articulos for select to authenticated using (visible or public.es_staff());
create policy art_staff on public.articulos for all to authenticated using (public.es_staff()) with check (public.es_staff());
create policy ev_ver on public.eventos for select to authenticated using (visible or public.es_staff());
create policy ev_staff on public.eventos for all to authenticated using (public.es_staff()) with check (public.es_staff());
create policy notif_propio on public.notificaciones for select to authenticated using (perfil_id = auth.uid());
create policy notif_leer on public.notificaciones for update to authenticated using (perfil_id = auth.uid()) with check (perfil_id = auth.uid());
create policy notif_staff on public.notificaciones for insert to authenticated with check (public.es_staff());

-- pagos (los crea el servidor con Stripe; aquí solo se consultan)
create policy cupones_admin on public.cupones for all to authenticated using (public.es_admin()) with check (public.es_admin());
create policy pagos_ver on public.pagos for select to authenticated using (perfil_id = auth.uid() or public.es_staff());
create policy pagos_admin on public.pagos for update to authenticated using (public.es_admin()) with check (public.es_admin());
create policy pc_ver on public.pagos_consultor for select to authenticated using (
  public.es_staff() or exists (select 1 from public.sesiones s where s.id = sesion_id and s.anfitrion_id = auth.uid())
);
create policy pc_staff on public.pagos_consultor for all to authenticated using (public.es_staff()) with check (public.es_staff());

-- ---------- Permisos de ejecución ----------
revoke execute on all functions in schema public from public, anon;
grant execute on all functions in schema public to authenticated, service_role;
alter default privileges in schema public revoke execute on functions from public, anon;
