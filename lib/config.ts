export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

/** Sin llaves de Supabase la plataforma corre con datos de ejemplo (para revisar el diseño). */
export const MODO_DEMO = !SUPABASE_URL || !SUPABASE_ANON_KEY;

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
export const PYXOOM_URL = process.env.NEXT_PUBLIC_PYXOOM_URL
  ?? 'https://wewow.pyxoomsaas.com/Interactive/Home/AddPersonalInformation/49bb7603-f7c4-4fb3-9cdc-b74ba08ea0a8';
export const WHATSAPP_URL = process.env.NEXT_PUBLIC_WHATSAPP_URL ?? 'https://chat.whatsapp.com/B67IFhZUMzrEVNwkdMWfYx';
