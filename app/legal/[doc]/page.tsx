import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Icon } from '@/components/ui';
import legal from '@/lib/legal.json';

const DOCS = { privacidad: ['Aviso de', 'privacidad.', legal.privacidad], terminos: ['Términos y', 'condiciones.', legal.terminos] } as const;
type Props = { params: Promise<{ doc: string }> };
export async function generateMetadata({ params }: Props) { const { doc } = await params; return { title: doc === 'terminos' ? 'Términos y condiciones' : 'Aviso de privacidad' }; }
export function generateStaticParams() { return [{ doc: 'privacidad' }, { doc: 'terminos' }]; }

export default async function Legal({ params }: Props) {
  const { doc } = await params;
  const d = DOCS[doc as keyof typeof DOCS]; if (!d) notFound();
  return (
    <main style={{ maxWidth: 820, margin: '0 auto', padding: '40px 20px 80px' }}>
      <Link href="/login" className="row sm" style={{ textDecoration: 'none', marginBottom: 22 }}><Icon name="back" size={16} />Volver</Link>
      <span className="eyebrow">Legal</span>
      <h1 className="t">{d[0]} <i>{d[1]}</i></h1>
      <div className="card w" style={{ marginTop: 24, gap: 14 }} dangerouslySetInnerHTML={{ __html: d[2] }} />
    </main>
  );
}
