# Arquitectura de la alpha

## Elecciones

Una aplicación Next.js con renderizado de servidor para navegación pública y componentes React interactivos para formularios, agenda y expedientes. Un único proceso Node y un único SQLite persistente reducen operación y permiten arrancar sin cuentas externas. Node 24 aporta `node:sqlite`; no hace falta un binario adicional de base de datos. `package-lock.json` fija las versiones resueltas.

Se usa `iron-session` para el protocolo de sesión cifrada y autenticada, bcrypt para contraseñas y Zod para límites y validación. La aplicación implementa autorización de dominio; no inventa criptografía ni un protocolo de sesión. Temporal convierte horas locales Europe/Madrid a instantes absolutos.

## Estructura

| Ruta                             | Responsabilidad                                                 |
| -------------------------------- | --------------------------------------------------------------- |
| `app/`                           | Rutas públicas y privadas, metadatos y API HTTP                 |
| `components/`                    | Interfaz de marca, formularios, agenda y expediente             |
| `lib/db.ts`                      | Conexión, migraciones, consultas parametrizadas y transacciones |
| `lib/accounts.ts`, `lib/auth.ts` | Credenciales, rate limit persistente y sesión                   |
| `lib/actions.ts`                 | Mutaciones autorizadas e invariantes de negocio                 |
| `lib/queries.ts`                 | Lecturas públicas, filtros por participante y datos de panel    |
| `lib/availability.ts`            | Cálculo de huecos y reglas de agenda                            |
| `migrations/`                    | Evolución reproducible del esquema                              |
| `scripts/`                       | Preparación, migración, demo y servidor aislado E2E             |
| `tests/`, `e2e/`                 | Dominio/concurrencia y recorridos de navegador                  |

Los registros que devuelve `node:sqlite` se convierten en objetos normales en la capa de consultas para cruzar la frontera de React Server Components. No se pasan hashes de contraseña a componentes ni respuestas de autenticación.

## Modelo relacional

`users` tiene un rol por cuenta; el registro público solo permite cliente o profesional. `professionals` pertenece a un usuario, tiene oficio y zonas, servicios, turnos, excepciones y trabajos de presentación. `own_clients` pertenece exclusivamente a un profesional y no es una cuenta de usuario.

Una `request` relaciona cliente y profesional y tiene una conversación única. Los mensajes pertenecen a esa conversación; los adjuntos pertenecen a la solicitud y pueden relacionarse con un mensaje del remitente. Los presupuestos guardan versiones y conceptos inmutables una vez enviados; una revisión crea otra versión y sustituye las anteriores.

Las reservas relacionan profesional, servicio y cliente de plataforma **o** cliente propio. Una restricción evita mezclar los dos orígenes y exige captación cero en citas propias. `completed_jobs` documenta la finalización. Las reseñas requieren una reserva completada y solo se admite una por reserva. El estado del cobro es una anotación, no una transacción financiera.

`status_history` conserva actor, entidad, transición, nota y fecha. `notifications` son avisos internos. Las incidencias relacionan contratación, autor y respuestas; administración consulta estos expedientes sin recibir permisos globales de lectura de los mensajes privados ni de clientes propios.

## Estados y acuerdos

Solicitud: `new → discussion/inspection → quoted → accepted → booked → completed`. Una propuesta rechazada vuelve a conversación. Una cita cancelada devuelve la solicitud a propuesta aceptada, para poder acordar otra fecha; su reserva cancelada se conserva. Cerrar una consulta sin contratación usa `cancelled` y sustituye las propuestas no reservadas.

Presupuesto: `sent → accepted/rejected/superseded`. Editar una propuesta aceptada sin reserva exige una nueva versión y aceptación. Se impiden cambios de propuesta con cita activa: hay que gestionar/cancelar esa cita antes. La aceptación no realiza ningún pago.

Reserva: `pending → confirmed → completed` o `pending/confirmed → cancelled`. Los pendientes y confirmados bloquean agenda. Solo el profesional confirma y finaliza; solo finaliza después de la hora prevista de fin y con resumen. El cliente cancela según la política del perfil, el profesional explica el motivo. No existen multas automáticas.

Incidencia: `open → reviewing → closed`, con respuestas y notas administrativas. Una incidencia cerrada no admite nuevas respuestas. No se calcula responsabilidad legal.

## Disponibilidad y exclusión mutua

1. Se valida la fecha dentro del horizonte de 90 días y el servicio activo del profesional.
2. Se convierten los turnos semanales de ese día a Europe/Madrid. Los candidatos se generan cada 30 minutos desde el inicio del turno.
3. Se descuentan duración del servicio, antelación mínima, citas pendientes/confirmadas, descanso posterior de cada cita y excepciones.
4. La creación vuelve a calcular todo bajo `BEGIN IMMEDIATE`. No confía en un hueco que el navegador consultó anteriormente.
5. Dos triggers de SQLite rechazan inserciones y actualizaciones solapadas usando intervalos semiabiertos `[starts_at,busy_until)`. Conexiones y procesos distintos quedan protegidos por el bloqueo de escritura y la restricción.

Una cita guarda la duración y el descanso que se aplicaron al crearla. Cambiar un servicio o preferencia no mueve la cita. Un bloqueo nuevo no puede invadir citas activas. Una cancelación cambia el estado dentro de la transacción y libera el intervalo sin borrar registros.

Las horas se guardan en milisegundos UTC; las reglas semanales son minutos locales. Temporal rechaza horas de inicio ambiguas o inexistentes en el cambio estacional. La duración reservada representa minutos transcurridos reales. Una reparación pendiente de diagnóstico no se agenda con una estimación definitiva: el servicio puede representar una visita de valoración, con alcance explícito.

## HTTP y seguridad

Las lecturas privadas requieren sesión vigente y filtran por usuario participante. Las mutaciones JSON pasan por `/api/action`; cada acción aplica su esquema y autorización de nuevo dentro de la transacción. Las rutas de archivos aplican los mismos permisos. La UI oculta acciones por rol como ayuda, pero la protección efectiva está en servidor.

La sesión contiene ID y versión, caduca en 8 horas, usa cookie HttpOnly y SameSite=Lax; Secure se desactiva exclusivamente en la configuración HTTP local. El servidor consulta el usuario en cada acceso, comprueba versión y estado habilitado. El cierre incrementa su versión y revoca todas las sesiones previas de esa cuenta. Los fallos de acceso no revelan si el correo existe.

Las mutaciones exigen coincidencia de `Origin` con `APP_ORIGIN`. Hay límites persistentes de intentos de acceso/registro, acciones por usuario y archivos. Las peticiones JSON y multipart se leen con límite real de bytes. Las fotografías se decodifican, limitan a 25 megapíxeles, convierten a WebP y eliminan metadatos; no se acepta SVG ni animación. Se guardan con UUID generado en servidor fuera del directorio público.

`proxy.ts` aplica CSP con nonce por petición, sin scripts inline generales en producción. En desarrollo, React requiere `unsafe-eval` para depuración según su guía oficial; esa directiva no se emite en producción. Los encabezados también impiden framing y detección de MIME. Esta configuración es una base para la alpha, no una auditoría de seguridad pública.

## Evolución

Se conserva un oficio normalizado inicial y el esquema permite otros. Para escalar a PostgreSQL habrá que migrar las consultas SQL y reemplazar los triggers por una restricción de exclusión o bloqueo transaccional equivalente. No se construye hoy una segunda capa de persistencia. Pagos, identidad real, recuperación de cuenta y notificaciones externas se integrarán por separado con proveedores adecuados y autorizaciones específicas.
