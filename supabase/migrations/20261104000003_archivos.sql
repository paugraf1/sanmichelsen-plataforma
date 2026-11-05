-- =====================================================================
-- 03 · Archivos privados (Supabase Storage)
-- privados/<inscripcion_id>/...   CVs, ejercicios y reportes de assessment
-- contenido/modulo-<n>/...        PDFs y plantillas de cada módulo
-- Ningún archivo es público: se descargan con enlaces firmados.
-- =====================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('privados', 'privados', false, 15728640, array['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document','image/png','image/jpeg']),
  ('contenido', 'contenido', false, 52428800, null)
on conflict (id) do nothing;

create policy privados_ver on storage.objects for select to authenticated using (
  bucket_id = 'privados' and (case when (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then public.puede_ver_privado(((storage.foldername(name))[1])::uuid) else false end)
);
create policy privados_subir on storage.objects for insert to authenticated with check (
  bucket_id = 'privados' and (case when (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then public.puede_ver_privado(((storage.foldername(name))[1])::uuid) else false end)
);
create policy privados_borrar on storage.objects for delete to authenticated using (
  bucket_id = 'privados' and (public.es_staff() or (case when (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then public.es_mia(((storage.foldername(name))[1])::uuid) else false end))
);

create policy contenido_ver on storage.objects for select to authenticated using (
  bucket_id = 'contenido' and (case when (storage.foldername(name))[1] ~ '^modulo-([1-9]|1[0-3])$' then public.puedo_ver_modulo(replace((storage.foldername(name))[1], 'modulo-', '')::smallint) else false end)
);
create policy contenido_admin on storage.objects for all to authenticated using (
  bucket_id = 'contenido' and public.es_admin()
) with check (
  bucket_id = 'contenido' and public.es_admin()
);
