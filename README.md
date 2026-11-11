# Executive Transition Academy · Plataforma

Plataforma del programa de Sandra Michelsen, hecha por PauGraf Web Design.

Está hecha con **Next.js**, usa **Supabase** como base de datos, usuarios y archivos privados, y se publica en **Netlify**.

## Qué incluye esta versión (Semana 2)

- **Sistema de diseño** con la marca de Sandra: paleta Paris, Cormorant Garamond y Figtree. Está en `app/globals.css` y `components/ui`.
- **Base de datos completa**, en `supabase/migrations`, con los permisos de cada rol:
  - **participante:** solo lo suyo.
  - **consultor:** solo sus participantes, con sus notas privadas.
  - **operaciones:** todos los participantes, sin notas privadas ni sueldos.
  - **admin (Sandra):** todo.
  - **empresa:** el avance y las sesiones de su gente, nunca el contenido privado.
- **Reglas del programa dentro de la base de datos**, para que nadie se las pueda saltar desde la página:
  - Primero van 2 sesiones con el consultor y después la de Sandra.
  - Si se cancela con menos de 24 h, la sesión cuenta como impartida.
  - No se puede agendar más sesiones de las que quedan.
  - El estatus de las empresas meta solo lo mueve el equipo.
  - Los directorios de la comunidad se abren con las reglas aceptadas y 5 contactos compartidos.
  - Una actividad enviada a revisión ya no se puede cambiar.
  - Los módulos bloqueados no muestran su contenido.
  - Solo admin cambia roles.
- **Portal del participante:**
  - Login con correo, Google o LinkedIn, y recuperar contraseña.
  - Primer ingreso: crear contraseña y dar las 3 aceptaciones.
  - Mi inicio y Mi preparación, con los 6 pasos y Pyxoom.
  - Mi programa con los 13 módulos (Aprende, Trabaja, Conversa).
  - Mis sesiones.
  - Mi búsqueda en 4 pasos.
  - Comunidad Elite Titans con su checklist y el WhatsApp.
  - Artículos, eventos y consultor virtual.
  - Versión de celular con barra inferior.

## Modo demo

Si no hay llaves de Supabase, la plataforma corre con datos de ejemplo de Mariana Ríos. Sirve para revisar el diseño. Todo funciona: guardar, enviar, cancelar, agregar, etc. Los datos viven en memoria y se reinician cuando se reinicia el servidor.

```bash
npm install
npm run dev         # http://localhost:3000
```

## Conectar Supabase (cuando Sandra tenga su cuenta)

1. **Crear el proyecto:** en supabase.com, crea un proyecto en la región más cercana (por ejemplo `us-east-1`).
2. **Base de datos:** en **SQL Editor**, ejecuta en este orden:
   1. `supabase/migrations/20261104000001_esquema.sql`
   2. `supabase/migrations/20261104000002_permisos.sql`
   3. `supabase/migrations/20261104000003_archivos.sql`
   4. `supabase/seed.sql`, que carga los programas, los paquetes de sesiones y los 13 módulos.
3. **Login, en Authentication:**
   - **URL Configuration:** Site URL `https://sanmichelsen.com`. Redirect URLs `https://sanmichelsen.com/auth/callback` y `http://localhost:3000/auth/callback`.
   - **Providers:** activa Email, Google y LinkedIn (OIDC), con sus llaves de Google Cloud y de LinkedIn Developers.
   - **Plantillas de correo:** los enlaces deben llevar a `/auth/callback`.
4. **Variables de entorno:** copia `.env.example` a `.env.local`, o ponlas en Netlify, con `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` (están en Project Settings → API).
5. **Primer admin:** cuando Sandra entre por primera vez, ejecuta en SQL Editor:
   `update perfiles set rol = 'admin' where correo = 'san@sanmichelsen.com';`

## Publicar en Netlify

1. Sube este repositorio a GitHub, en la cuenta de Sandra.
2. En Netlify: **Add new site → Import from Git**, y elige el repositorio. Netlify detecta Next.js solo. `netlify.toml` ya trae la configuración.
3. Agrega las variables de entorno del paso 4.
4. En **Domain management**, conecta `sanmichelsen.com`. Los DNS están en Cloudflare.

## Pruebas de permisos

`supabase/pruebas/probar_permisos.py` levanta usuarios de cada rol en un Postgres local y revisa 79 casos: qué ve y qué puede hacer cada quien. Para correrlo:

```bash
# Postgres 16 local en el puerto 5544
psql -f supabase/pruebas/00_supabase_local.sql
psql -f supabase/migrations/20261104000001_esquema.sql
psql -f supabase/migrations/20261104000002_permisos.sql
psql -f supabase/pruebas/01_grants_locales.sql
psql -f supabase/seed.sql
python3 supabase/pruebas/probar_permisos.py "host=... port=5544 user=postgres dbname=eta"
```

## Lo que sigue

- **Semana 3:** paneles de consultor, operaciones, admin y empresa; pagos con Stripe; sesiones con Calendly; subida de archivos.
- **Semana 4:** correos automáticos, consultor virtual con IA, búsqueda de vacantes y reportes.
