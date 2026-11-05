import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import { Avisos } from '@/components/ui/cliente';
import { MODO_DEMO } from '@/lib/config';
import './globals.css';

const serif = localFont({
  variable: '--font-serif', display: 'swap',
  src: [
    { path: './fonts/cormorant-garamond-latin-400-normal.woff2', weight: '400', style: 'normal' },
    { path: './fonts/cormorant-garamond-latin-400-italic.woff2', weight: '400', style: 'italic' },
    { path: './fonts/cormorant-garamond-latin-500-normal.woff2', weight: '500', style: 'normal' },
    { path: './fonts/cormorant-garamond-latin-500-italic.woff2', weight: '500', style: 'italic' },
  ],
});
const sans = localFont({
  variable: '--font-sans', display: 'swap',
  src: [
    { path: './fonts/figtree-latin-300-normal.woff2', weight: '300' },
    { path: './fonts/figtree-latin-400-normal.woff2', weight: '400' },
    { path: './fonts/figtree-latin-500-normal.woff2', weight: '500' },
    { path: './fonts/figtree-latin-600-normal.woff2', weight: '600' },
  ],
});

export const metadata: Metadata = {
  title: { default: 'Executive Transition Academy · Sandra Michelsen', template: '%s · Sandra Michelsen' },
  description: 'Tu plataforma del programa Executive Transition Academy.',
  robots: { index: false },
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#FCFCF2' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-MX" className={`${serif.variable} ${sans.variable}`}>
      <body className={MODO_DEMO ? 'has-demo' : undefined}>
        {MODO_DEMO ? <div className="demo-bar"><b>Modo demo</b> Datos de ejemplo<span className="largo">. Se conecta a la base de datos cuando se agregan las llaves de Supabase</span>.</div> : null}
        <Avisos>{children}</Avisos>
      </body>
    </html>
  );
}
