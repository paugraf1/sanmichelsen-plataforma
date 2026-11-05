import { NextResponse, type NextRequest } from 'next/server';
import { MODO_DEMO } from '@/lib/config';
import { supabaseServidor } from '@/lib/supabase/server';

/** Regreso del login con Google o LinkedIn y de los enlaces de correo. */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const siguiente = url.searchParams.get('siguiente') ?? '/inicio';
  const destino = siguiente.startsWith('/') && !siguiente.startsWith('//') ? siguiente : '/inicio';
  if (MODO_DEMO || !code) return NextResponse.redirect(new URL(MODO_DEMO ? '/inicio' : '/login?error=enlace', url.origin));
  const sb = await supabaseServidor();
  const { error } = await sb.auth.exchangeCodeForSession(code);
  return NextResponse.redirect(new URL(error ? '/login?error=enlace' : destino, url.origin));
}
