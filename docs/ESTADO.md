# Estado funcional

## Implementado

La alpha conecta los recorridos A (cliente), B (profesional), C (cliente propio), D (cancelación) y E (incidencia). La evidencia de ejecución y sus límites están en `VALIDACION.md`.

| Área               | Versión implementada                                                                                           |
| ------------------ | -------------------------------------------------------------------------------------------------------------- |
| Descubrimiento     | Búsqueda, filtros, fecha con huecos, comparación, ordenación y perfiles públicos                               |
| Perfil profesional | Presentación, nombre, zonas, experiencia declarada, remoto y trabajos publicados editables                     |
| Solicitudes        | Guía en tres pasos, síntomas, modalidad, profesional, fotos y expediente persistente                           |
| Mensajes           | Cronología, remitente, acceso de participantes, fotografías y actualización cada 8 segundos                    |
| Agenda             | Turnos múltiples por día, descansos, antelación, bloqueos, vacaciones y vista semanal                          |
| Reservas           | Propuesta aceptada, selección real, confirmación manual/automática y prevención transaccional de solapamientos |
| Clientes propios   | Ficha editable, notas privadas, citas manuales, historial y captación cero                                     |
| Presupuestos       | Conceptos, total, notas, envío, aceptación/rechazo, versiones y trazabilidad                                   |
| Cancelación        | Motivo, política por profesional, liberación del hueco, histórico intacto y avisos internos                    |
| Finalización       | Tras el fin de la cita, resumen, historial, estado administrativo del cobro y reseña del cliente               |
| Incidencias        | Apertura por participante, réplicas y revisión/cierre por administrador                                        |
| Seguridad local    | Hash bcrypt, iron-session, roles, autorización en servidor, CSRF, CSP, límites y archivos privados             |
| Persistencia       | SQLite, migración reproducible, demo idempotente, pruebas de reapertura y concurrencia                         |

## Pendiente o fuera del alcance

- Pagos y suscripciones reales, facturas fiscales, seguros, devoluciones y arbitraje legal.
- Diagnóstico automático, videollamadas integradas y atención urgente.
- Identidad y acreditaciones profesionales verificadas; verificación y recuperación de correo; 2FA.
- Correos, push, SMS, WebSockets, lista de espera y calendarios externos.
- Foto de avatar personalizada y galería fotográfica pública de trabajos. El avatar de la alpha usa iniciales; los trabajos publicados tienen título y descripción. Las fotos privadas de diagnóstico sí funcionan.
- Distancias por GPS, mapas, rutas de desplazamiento y oficios distintos de fontanería.
- Exportación comercial de presupuestos en PDF, factura, conciliación o contabilidad.
- Operación multiinstancia, alta disponibilidad, backups gestionados y auditoría legal/de seguridad externa.
- Pruebas en Safari, Firefox, lectores de pantalla y dispositivos físicos.
- Actualización conjunta de la cadena de ESLint: hay un aviso moderado transitivo de `minimatch` y la versión del linter compatible con los plugins actuales ya no tiene soporte. La auditoría de dependencias de ejecución devuelve cero avisos; ver `VALIDACION.md`.

La prioridad siguiente es observar el uso de agenda, consultas y presupuestos con profesionales reales en una prueba controlada. Después: recuperación de cuenta, privacidad operativa, verificación y condiciones comerciales antes de una apertura pública.
