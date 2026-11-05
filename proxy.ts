import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { MODO_DEMO, SUPABASE_ANON_KEY, SUPABASE_URL } from './lib/config';

const PUBLICAS = ['/login', '/recuperar', '/auth', '/legal'];

/** Renueva la sesión en cada visita y manda al login a quien no ha entrado. */
export async function proxy(request: NextRequest) {
  if (MODO_DEMO) return NextResponse.next();

  let response = NextResponse.next({ request });
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { data } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;
  const publica = PUBLICAS.some((p) => path === p || path.startsWith(p + '/'));

  if (!data.user && !publica) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('volver', path);
    return NextResponse.redirect(url);
  }
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|fonts|.*\\.(?:png|jpg|jpeg|svg|webp|ico|woff2|pdf)$).*)'],
};
