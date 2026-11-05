-- =====================================================================
-- Datos base: programas, paquetes de sesiones y los 13 módulos.
-- Los precios se dejan vacíos hasta que Sandra los defina.
-- =====================================================================

insert into public.programas (clave, nombre, tipo, descripcion, sesiones_consultor, sesiones_sandra, meses_vigencia, llamada_arranque, incluye, orden) values
('esencial','Esencial','individual','Metodología y revisión de CV, a tu ritmo.',0,0,6,false,
  array['13 módulos de metodología','Revisión de CV','Comunidad Elite Titans','Consultor virtual'],1),
('ejecutivo','Ejecutivo','individual','Acompañamiento 1:1 con consultor y con Sandra.',7,2,6,true,
  array['Todo lo de Esencial','7 sesiones con tu consultor','2 sesiones con Sandra','Directorio de headhunters','Acercamiento a contactos en tus empresas meta'],2),
('premium','Premium','individual','La experiencia completa para posiciones C-Level.',10,4,9,true,
  array['Todo lo de Ejecutivo','Sesiones adicionales','Más tiempo de acompañamiento','Preparación y seguimiento de cada entrevista'],3),
('outplacement-2','Outplacement 2 meses','empresa',null,4,1,2,true,'{}',10),
('outplacement-4','Outplacement 4 meses','empresa',null,8,2,4,true,'{}',11),
('outplacement-6','Outplacement 6 meses','empresa',null,10,3,6,true,'{}',12)
on conflict (clave) do nothing;

insert into public.paquetes_sesiones (cantidad, con) values
(1,'consultor'),(3,'consultor'),(5,'consultor'),(1,'sandra'),(3,'sandra'),(5,'sandra')
on conflict do nothing;

insert into public.modulos (numero, fase, titulo, minutos) values
(1,'reconecta','Redefiniendo tu carrera',40),
(2,'reconecta','Desafío emocional en la transición',35),
(3,'reconecta','Bienestar emocional',30),
(4,'reconecta','Reinventa tu búsqueda',40),
(5,'posicionate','Tu marca profesional',45),
(6,'posicionate','Tu meta, tu éxito',40),
(7,'posicionate','Habilidades y logros',50),
(8,'posicionate','Tu mensaje de marca',40),
(9,'activa','CV de alto impacto',60),
(10,'activa','LinkedIn estratégico',50),
(11,'activa','Estrategia profesional',45),
(12,'concreta','Claves para entrevistas',55),
(13,'concreta','Negociación integral',50)
on conflict (numero) do nothing;

insert into public.modulo_contenido (modulo)
select numero from public.modulos on conflict do nothing;
