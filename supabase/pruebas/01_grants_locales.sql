-- En Supabase estos permisos vienen dados; aquí los imitamos.
grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete on all tables in schema public to authenticated, service_role;
grant select on public.programas, public.paquetes_sesiones to anon;
grant usage, select on all sequences in schema public to authenticated, service_role;
