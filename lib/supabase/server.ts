import 'server-only';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '../config';

/** Cliente de Supabase para componentes de servidor y acciones. Respeta los permisos (RLS) del usuario. */
export async function supabaseServidor() {
  const jar = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => jar.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => jar.set(name, value, options));
        } catch {
          // En componentes de servidor no se pueden escribir cookies; el proxy las renueva.
        }
      },
    },
  });
}
