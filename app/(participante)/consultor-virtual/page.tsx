import { Icon, PageHead } from '@/components/ui';
export const metadata = { title: 'Consultor virtual' };
export default function Virtual() {
  return (
    <>
      <PageHead eyebrow="Consultor virtual" title={<>Practica <i>cuando quieras.</i></>} lead="Un chat con inteligencia artificial para practicar entrevistas, ordenar tus logros y preparar tus mensajes." />
      <div className="card d ctr" style={{ maxWidth: 620, margin: '0 auto', padding: 40 }}><span className="av lg"><Icon name="spark" size={24} /></span><h2 className="hs">Se activa en la siguiente etapa</h2><p className="mut" style={{ margin: 0 }}>Con los 5 prompts de Sandra: entrevistas, logros, LinkedIn, negociación y mensajes de networking.</p></div>
    </>
  );
}
