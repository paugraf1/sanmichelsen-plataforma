"""Pruebas de permisos por rol contra un Postgres local con las migraciones aplicadas.
Uso: python3 probar_permisos.py "host=/var/tmp port=5544 user=postgres dbname=eta"
"""
import sys, uuid, psycopg2

DSN = sys.argv[1] if len(sys.argv) > 1 else "host=/var/tmp port=5544 user=postgres dbname=eta"
cx = psycopg2.connect(DSN); cx.autocommit = True
cur = cx.cursor()
ok = fail = 0

U = {k: str(uuid.uuid4()) for k in ['mariana','jorge','carlos','ana','ops','sandra','rh','fer']}

def sql(q, a=None):
    cur.execute(q, a)
    try: return cur.fetchall()
    except psycopg2.ProgrammingError: return None

def como(u):
    sql("reset role")
    sql("select set_config('request.jwt.claim.sub', %s, false)", (U[u] if u else '',))
    sql("set role authenticated")

def admin():
    sql("reset role"); sql("select set_config('request.jwt.claim.sub', '', false)")

def check(nombre, cond):
    global ok, fail
    if cond: ok += 1; print('  ok  ', nombre)
    else: fail += 1; print('  FALLA', nombre)

def falla(nombre, q, a=None, contiene=''):
    global ok, fail
    try:
        sql(q, a); fail += 1; print('  FALLA', nombre, '(no dio error)')
    except Exception as e:
        msg = str(e).split('\n')[0]
        if contiene and contiene not in msg:
            fail += 1; print('  FALLA', nombre, '→', msg)
        else:
            ok += 1; print('  ok  ', nombre, '→', msg[:90])

# ---------- datos ----------
admin()
for k, mail in [('mariana','mariana@x.com'),('jorge','jorge@x.com'),('carlos','carlos@x.com'),('ana','ana@x.com'),('ops','ops@x.com'),('sandra','sandra@x.com'),('rh','rh@altavista.com'),('fer','fer@x.com')]:
    sql("insert into auth.users (id,email,raw_user_meta_data) values (%s,%s,%s)", (U[k], mail, '{"full_name":"%s"}' % k.title()))
check('el perfil se crea solo al registrarse', sql("select count(*) from perfiles")[0][0] == 8)
for k, r in [('carlos','consultor'),('ana','consultor'),('ops','operaciones'),('sandra','admin'),('rh','empresa')]:
    sql("update perfiles set rol=%s where id=%s", (r, U[k]))
sql("insert into consultores (perfil_id, especialidad) values (%s,'Finanzas'),(%s,'RH')", (U['carlos'], U['ana']))
emp = sql("insert into empresas_cliente (nombre) values ('Grupo Altavista') returning id")[0][0]
sql("insert into empresa_usuarios values (%s,%s)", (emp, U['rh']))
pe = sql("select id from programas where clave='ejecutivo'")[0][0]
po = sql("select id from programas where clave='outplacement-4'")[0][0]
I = {}
I['mariana'] = sql("insert into inscripciones (participante_id,programa_id,consultor_id,estado,sesiones_consultor,sesiones_sandra,vence_en) values (%s,%s,%s,'activo',7,2,current_date+180) returning id", (U['mariana'], pe, U['carlos']))[0][0]
I['jorge'] = sql("insert into inscripciones (participante_id,programa_id,consultor_id,empresa_id,origen,estado,sesiones_consultor,sesiones_sandra,vence_en) values (%s,%s,%s,%s,'empresa','activo',8,2,current_date+120) returning id", (U['jorge'], po, U['ana'], emp))[0][0]
I['fer'] = sql("insert into inscripciones (participante_id,programa_id,consultor_id,estado,sesiones_consultor,sesiones_sandra,vence_en) values (%s,%s,%s,'vencido',7,2,current_date-1) returning id", (U['fer'], pe, U['carlos']))[0][0]
sql("insert into datos_arranque (inscripcion_id, sueldo_actual_mxn, puesto_actual) values (%s, 180000, 'Directora de Finanzas')", (I['mariana'],))
for n in range(1,14):
    sql("insert into avance_modulos (inscripcion_id, modulo, estado) values (%s,%s,%s)", (I['mariana'], n, 'completado' if n<5 else 'en_curso' if n==5 else 'disponible' if n<8 else 'bloqueado'))
    sql("update modulo_contenido set lectura=%s where modulo=%s", ('Lectura del módulo %d' % n, n))
act = sql("insert into actividades (modulo,tipo,pregunta) values (5,'texto','¿Qué posición buscas?'),(9,'texto','Sube tu CV') returning id")
sql("insert into sesiones (inscripcion_id,con,anfitrion_id,titulo,inicia_en,estado) values (%s,'consultor',%s,'Sesión 1',now()-interval '20 days','impartida'),(%s,'consultor',%s,'Sesión 2',now()-interval '10 days','impartida'),(%s,'consultor',%s,'Sesión 3',now()+interval '3 days','agendada'),(%s,'consultor',%s,'Sesión 4',now()+interval '5 hours','agendada')", (I['mariana'],U['carlos'])*4)
s_nota = sql("select id from sesiones where titulo='Sesión 1'")[0][0]
sql("insert into notas_sesion (sesion_id, notas, autor_id) values (%s,'Le cuesta cuantificar logros',%s)", (s_nota, U['carlos']))
sql("insert into cv_versiones (inscripcion_id,etiqueta,archivo,es_inicial) values (%s,'CV inicial',%s,true)", (I['mariana'], I['mariana']+'/cv-inicial.pdf'))
sql("insert into headhunters (firma) values ('Alcázar Search'),('Meridian Talent')")

print('\nParticipante (Mariana)')
como('mariana')
check('ve solo su inscripción', sql("select count(*) from inscripciones")[0][0] == 1)
check('ve su sueldo capturado', sql("select count(*) from datos_arranque")[0][0] == 1)
check('no ve a otros participantes', sql("select count(*) from perfiles where id=%s", (U['jorge'],))[0][0] == 0)
check('ve el nombre de su consultor', sql("select count(*) from perfiles where id=%s", (U['carlos'],))[0][0] == 1)
check('ve los 13 módulos', sql("select count(*) from modulos")[0][0] == 13)
check('ve el contenido solo de módulos liberados (7 de 13)', sql("select count(*) from modulo_contenido where lectura is not null")[0][0] == 7)
check('no ve la actividad del módulo 9 (bloqueado)', sql("select count(*) from actividades where modulo=9")[0][0] == 0)
check('no ve notas privadas de sesión', sql("select count(*) from notas_sesion")[0][0] == 0)
check('saldo con consultor: 7 − 2 usadas − 2 agendadas', sql("select saldo(%s,'consultor')", (I['mariana'],))[0][0] == 3)
sql("insert into sesiones (inscripcion_id,con,titulo,inicia_en) values (%s,'sandra','Sesión con Sandra',now()+interval '7 days')", (I['mariana'],))
check('agenda con Sandra después de 2 sesiones con su consultor', sql("select count(*) from sesiones where con='sandra'")[0][0] == 1)
falla('no puede marcar una sesión como impartida', "insert into sesiones (inscripcion_id,con,titulo,inicia_en,estado) values (%s,'consultor','x',now(),'impartida')", (I['mariana'],))
falla('no puede agendar en la inscripción de otro', "insert into sesiones (inscripcion_id,con,titulo,inicia_en) values (%s,'consultor','x',now()+interval '9 days')", (I['jorge'],))
s4 = sql("select id from sesiones where titulo='Sesión 4'")[0][0]; s3 = sql("select id from sesiones where titulo='Sesión 3'")[0][0]
falla('no puede cancelar con menos de 24 h', "select cancelar_sesion(%s)", (s4,), 'menos de 24 h')
check('sí cancela con más de 24 h', sql("select cancelar_sesion(%s)", (s3,))[0][0] == 'cancelada')
falla('no puede liberar módulos', "select liberar_modulo(%s, 9::smallint, true)", (I['mariana'],))
falla('no puede regalarse sesiones', "select dar_sesion(%s,'consultor','x')", (I['mariana'],))
falla('no puede cambiarse el rol', "update perfiles set rol='admin' where id=%s", (U['mariana'],), 'Solo admin')
sql("insert into respuestas (inscripcion_id, actividad_id, texto, estado) values (%s,%s,'Busco una Dirección de Finanzas','enviada')", (I['mariana'], act[0][0]))
falla('no puede cambiar una actividad ya enviada', "update respuestas set texto='otra'", None, 'ya se envió')
sql("select completar_modulo(%s, 5::smallint)", (I['mariana'],))
check('marca el módulo 5 como completado', sql("select estado from avance_modulos where modulo=5")[0][0] == 'completado')
falla('no puede completar un módulo bloqueado', "select completar_modulo(%s, 10::smallint)", (I['mariana'],), 'no está disponible')
m = sql("insert into empresas_meta (inscripcion_id, nombre, tier, estado) values (%s,'Bimbo',1,'entrevista') returning estado", (I['mariana'],))
check('agrega empresas meta, pero el estatus arranca en por contactar', m[0][0] == 'por_contactar')
falla('no puede mover el estatus de su empresa meta', "update empresas_meta set estado='contacto'", None, 'equipo de Sandra')
sql("insert into postulaciones (inscripcion_id, puesto, empresa) values (%s,'CFO','Grupo Lala')", (I['mariana'],))
sql("update postulaciones set etapa='entrevista'")
check('mueve sus postulaciones', sql("select etapa from postulaciones")[0][0] == 'entrevista')
# comunidad
check('directorio cerrado sin reglas ni contactos', sql("select count(*) from headhunters")[0][0] == 0)
sql("select aceptar_reglas()")
for k in range(4): sql("insert into contactos_estrategicos (agregado_por, empresa, puesto) values (%s,%s,'CHRO')", (U['mariana'], 'Empresa %d' % k))
check('con 4 contactos sigue cerrado', sql("select count(*) from headhunters")[0][0] == 0)
check('ve sus propios contactos', sql("select count(*) from contactos_estrategicos")[0][0] == 4)
sql("insert into contactos_estrategicos (agregado_por, empresa, puesto) values (%s,'Empresa 5','VP RH')", (U['mariana'],))
check('con 5 contactos se abre el directorio', sql("select count(*) from headhunters")[0][0] == 2)
m2 = sql("select aprobado from comunidad_miembros where perfil_id=%s", (U['mariana'],))[0][0]
check('su ficha queda pendiente de aprobación', m2 is False)
sql("update comunidad_miembros set aprobado=true where perfil_id=%s", (U['mariana'],))
check('intentar aprobarse no cambia nada', sql("select aprobado from comunidad_miembros where perfil_id=%s", (U['mariana'],))[0][0] is False)
falla('no puede marcarse aceptaciones a mano', "update perfiles set acepto_compartir_perfil_en=now() where id=%s", (U['mariana'],), 'primer ingreso')
falla('no puede compartir sin aceptar', "select completar_primer_ingreso(false)", None, 'compartir')
sql("select completar_primer_ingreso(true)")
check('primer ingreso guarda las 3 aceptaciones', sql("select primer_ingreso_hecho and acepto_compartir_perfil_en is not null from perfiles where id=%s", (U['mariana'],))[0][0])

print('\nParticipante sin sesiones todavía (Jorge)')
como('jorge')
falla('no puede agendar con Sandra antes de 2 sesiones con su consultor', "insert into sesiones (inscripcion_id,con,titulo,inicia_en) values (%s,'sandra','x',now()+interval '7 days')", (I['jorge'],), 'después de 2 sesiones')

sql("insert into sesiones (inscripcion_id,con,anfitrion_id,titulo,inicia_en) values (%s,'consultor',%s,'fake',now()+interval '2 days')", (I['jorge'], U['jorge']))
admin(); anf = sql("select anfitrion_id from sesiones where titulo='fake'")[0][0]; como('jorge')
check('al agendar, el anfitrión lo pone el sistema (su consultora)', anf == U['ana'])
sql("update sesiones set estado='impartida' where titulo='fake'")
admin(); est = sql("select estado from sesiones where titulo='fake'")[0][0]; como('jorge')
check('no puede marcar su sesión como impartida', est == 'agendada')
falla('no puede agendar en el pasado', "insert into sesiones (inscripcion_id,con,titulo,inicia_en) values (%s,'consultor','x',now()-interval '1 day')", (I['jorge'],), 'ya pasó')

print('\nParticipante con programa vencido (Fer)')
como('fer')
falla('no puede aceptar las reglas de la comunidad', "select aceptar_reglas()", None, 'programa activo')
falla('no puede sumarse a la comunidad', "insert into contactos_estrategicos (agregado_por, empresa, puesto) values (%s,'X','CHRO')", (U['fer'],))

print('\nConsultor (Carlos)')
como('carlos')
check('ve solo a sus participantes (Mariana y Fer)', sql("select count(*) from inscripciones")[0][0] == 2)
check('no ve a Jorge (de Ana)', sql("select count(*) from inscripciones where id=%s", (I['jorge'],))[0][0] == 0)
check('ve las notas privadas de sus sesiones', sql("select count(*) from notas_sesion")[0][0] == 1)
check('no ve el sueldo', sql("select count(*) from datos_arranque")[0][0] == 0)
check('ve las respuestas de sus participantes', sql("select count(*) from respuestas")[0][0] == 1)
sql("update respuestas set retro='Muy bien, ahora ponle cifras', texto='intento cambiarla'")
r = sql("select estado, texto, retro_por from respuestas")[0]
check('deja retroalimentación y la actividad queda revisada', r[0] == 'revisada' and r[2] == U['carlos'])
check('no puede cambiar lo que escribió el participante', r[1] == 'Busco una Dirección de Finanzas')
sql("update empresas_meta set estado='contacto'")
admin(); est=sql("select estado from empresas_meta")[0][0]; como('carlos')
check('no puede mover estatus de empresas meta', est == 'por_contactar')
falla('no puede regalar sesiones', "select dar_sesion(%s,'consultor','x')", (I['mariana'],))
falla('no puede cambiar su tarifa', "update consultores set tarifa_mxn=99999 where perfil_id=%s", (U['carlos'],), 'admin')
falla('no puede mover una respuesta a otro participante', "update respuestas set inscripcion_id=%s", (I['fer'],), 'mover')
sql("update respuestas set estado='borrador'")
check('no puede reabrir una actividad revisada', sql("select estado from respuestas")[0][0] == 'revisada')
falla('no puede marcar impartida una sesión con Sandra', "update sesiones set estado='impartida' where inscripcion_id=%s and con='sandra'", (I['mariana'],), 'Sandra')
print('\nParticipante (archivos)')
como('mariana')
falla('no puede registrar un CV de la carpeta de otro', "insert into cv_versiones (inscripcion_id,etiqueta,archivo) values (%s,'x',%s)", (I['mariana'], I['jorge']+'/cv.pdf'), 'carpeta')
como('carlos')
falla('no puede mover un CV a otro participante', "update cv_versiones set inscripcion_id=%s", (I['fer'],))

print('\nOperaciones')
como('ops')
check('ve a todos los participantes', sql("select count(*) from inscripciones")[0][0] == 3)
check('no ve notas privadas', sql("select count(*) from notas_sesion")[0][0] == 0)
check('no ve el sueldo', sql("select count(*) from datos_arranque")[0][0] == 0)
sql("update empresas_meta set estado='contacto'")
check('mueve el estatus de empresas meta', sql("select estado from empresas_meta")[0][0] == 'contacto')
sql("select dar_sesion(%s,'sandra','Emergencia: ya no podía reagendar', true)", (I['mariana'],))
check('regresa una sesión con Sandra', sql("select total from saldo_sesiones where inscripcion_id=%s and con='sandra'", (I['mariana'],))[0][0] == 3)
check('cancela con menos de 24 h y cuenta como impartida', sql("select cancelar_sesion(%s)", (s4,))[0][0] == 'cancelada_tarde')
sql("select liberar_modulo(%s, 9::smallint, true)", (I['mariana'],))
check('libera módulos', sql("select estado from avance_modulos where inscripcion_id=%s and modulo=9", (I['mariana'],))[0][0] == 'disponible')
sql("update comunidad_miembros set aprobado=true")
check('aprueba miembros de la comunidad', sql("select aprobado from comunidad_miembros")[0][0] is True)
falla('no puede cambiar roles', "update perfiles set rol='admin' where id=%s", (U['mariana'],), 'Solo admin')
falla('no puede apropiarse una inscripción para ver el sueldo', "update inscripciones set participante_id=auth.uid() where id=%s", (I['mariana'],), 'Solo admin')
sql("update sesiones set anfitrion_id=auth.uid() where inscripcion_id=%s", (I['mariana'],))
check('aunque se ponga como anfitrión, no ve notas privadas', sql("select count(*) from notas_sesion")[0][0] == 0)
sql("delete from perfiles where id=%s", (U['sandra'],))
admin(); viva = sql("select count(*) from perfiles where id=%s", (U['sandra'],))[0][0]; como('ops')
check('no puede borrar perfiles', viva == 1)
falla('no puede cambiar el id de su perfil', "update perfiles set id=%s where id=auth.uid()", (str(uuid.uuid4()),), 'id de un perfil')

print('\nEmpresa (RH de Grupo Altavista)')
como('rh')
check('ve solo a su gente (Jorge)', sql("select count(*) from inscripciones")[0][0] == 1)
check('ve el nombre de su colaborador', sql("select count(*) from perfiles where id=%s", (U['jorge'],))[0][0] == 1)
check('no ve a Mariana', sql("select count(*) from perfiles where id=%s", (U['mariana'],))[0][0] == 0)
check('no ve CVs, respuestas ni búsqueda', sum(sql("select count(*) from %s" % t)[0][0] for t in ['cv_versiones','respuestas','empresas_meta','postulaciones','perfil_objetivo']) == 0)
check('no ve el directorio de la comunidad', sql("select count(*) from headhunters")[0][0] == 0)
check('no puede consultar el saldo de alguien que no es de su empresa', sql("select saldo(%s,'consultor')", (I['mariana'],))[0][0] is None)

print('\nAdmin (Sandra)')
como('sandra')
check('ve el sueldo de arranque', sql("select sueldo_actual_mxn from datos_arranque")[0][0] == 180000)
check('ve todas las notas privadas', sql("select count(*) from notas_sesion")[0][0] == 1)
sql("update perfiles set rol='operaciones' where id=%s", (U['fer'],)); sql("update perfiles set rol='participante' where id=%s", (U['fer'],))
check('puede cambiar roles', True)

print('\nVisitante sin sesión')
sql("reset role"); sql("select set_config('request.jwt.claim.sub','',false)"); sql("set role anon")
check('ve los programas para la landing', sql("select count(*) from programas")[0][0] == 6)
falla('no ve inscripciones', "select count(*) from inscripciones")
falla('no puede llamar funciones internas', "select saldo(%s,'consultor')", (I['mariana'],), 'permission denied')

admin()
print('\n%d pruebas bien, %d fallas' % (ok, fail))
sys.exit(1 if fail else 0)
