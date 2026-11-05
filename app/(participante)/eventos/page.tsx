import { Icon, PageHead } from '@/components/ui';
export const metadata = { title: 'Webinars y eventos' };
export default function Eventos() {
  return (
    <>
      <PageHead eyebrow="Webinars y eventos" title={<>Muy <i>pronto.</i></>} lead="Estamos preparando webinars y encuentros de la comunidad. Te avisamos por correo y aquí mismo." />
      <div className="card w ctr" style={{ maxWidth: 560, margin: '0 auto', padding: 40 }}><span className="av lg"><Icon name="video" size={24} /></span><p className="mut" style={{ margin: 0 }}>Cuando haya un evento te llega una notificación.</p></div>
    </>
  );
}
