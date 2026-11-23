# Validación histórica de OFICERCA Alpha 0.1

> Registro de una ejecución anterior conservado como contexto. Las comprobaciones no se han repetido al preparar la copia pública. Las capturas y los informes locales mencionados no se incluyen en el repositorio.

Fecha de comprobación: **3 de noviembre de 2026**, Europe/Madrid.

Entorno: Windows, Node.js 24.17.0, Next.js 16.4.3, React 19.3.1, SQLite nativo, Vitest 5.0.5 y Playwright 1.64.1 con Chromium. No se ha publicado ni contratado ningún servicio externo.

## Resultados

| Comprobación                                  | Resultado observado                                                                          |
| --------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `npm run setup`                               | Correcto; genera configuración local y conserva datos existentes al repetirlo                |
| `npm run typecheck`                           | Correcto                                                                                     |
| `npm run lint`                                | Correcto, sin errores ni advertencias de reglas                                              |
| `npm test`                                    | **32 pruebas aprobadas**, en dos archivos                                                    |
| `npm run test:e2e`                            | **6 recorridos aprobados**, con servidor de producción local y datos aislados                |
| `npm run build`                               | Compilación optimizada correcta, sin advertencias de compilación                             |
| `npm start`                                   | Arranque correcto en bucle local, puerto 3000                                                |
| HTTP público                                  | Inicio, explorador, perfil de Javier, acceso, página profesional y condiciones devuelven 200 |
| `npm audit --omit=dev --audit-level=moderate` | **0 vulnerabilidades notificadas** en dependencias de ejecución                              |
| `npm audit --audit-level=moderate`            | **16 avisos moderados** en la cadena de herramientas de desarrollo; pendiente descrito abajo |
| Exclusiones de Git                            | `.env.local`, datos privados, `node_modules`, `.next` y `.next-e2e` ignorados                |

El resultado de compilación y pruebas no constituye una auditoría externa de seguridad ni una certificación legal.

## Qué comprueban las pruebas de dominio

- Registro, contraseñas bcrypt, sesión de cuenta habilitada y rechazo de credenciales incorrectas o cuentas demo fuera del origen local configurado.
- Registro público limitado a cliente/profesional y límites persistentes de intentos.
- Acceso a solicitudes y mensajes solo para sus participantes, sin acceso general para administración.
- Notas de clientes propios privadas y edición de trabajos publicados limitada a su titular.
- Conversaciones persistentes y ordenadas, validación de solicitudes y avisos internos.
- Presupuestos con versiones y conceptos conservados; aceptación exclusiva del cliente; rechazo de aceptaciones repetidas u obsoletas.
- Inspección que sustituye ofertas todavía no reservadas; solicitudes cerradas protegidas.
- Turnos, duración, antelación mínima, descansos y bloqueos; rechazo de huecos fuera de horario.
- Reserva manual o automática, cita pendiente que bloquea agenda y modificación de presupuesto impedida con cita activa.
- Cancelación según plazo, hueco liberado y conservación de conversación, acuerdos e historial.
- Citas de clientes propios con captación cero y sin crear una cuenta de cliente de plataforma.
- Finalización tras la hora de fin, resumen guardado, reseña vinculada a trabajo completado y anotación administrativa del cobro.
- Incidencia, respuesta de la otra parte, permisos administrativos, revisión/cierre e historial.
- Conversión Europe/Madrid, cambios de compensación UTC, horas locales ambiguas/inexistentes y horizonte de 90 días.
- Normalización de registros SQLite para su serialización segura en React.

La prueba de concurrencia lanza **dos procesos independientes** contra el mismo archivo SQLite. Solo uno consigue crear la reserva; el otro recibe conflicto. Después se reabre la base y se verifica que hay exactamente una reserva persistida. También se comprueba que una actualización SQL directa no puede reactivar una cita solapada.

## Recorridos de navegador

1. **Descubrimiento:** landing, búsqueda, comparación, ficha pública y navegación móvil. Sin errores JavaScript observados en ese recorrido. Se comprueba ausencia de desbordamiento de perfil a 320, 360, 768 y 1440 px.
2. **Contratación e incidencia:** cliente crea consulta con foto y síntomas; ambos escriben mensajes; profesional envía presupuesto; cliente acepta y reserva; profesional confirma; cliente cancela; el hueco vuelve a ofrecerse y se conserva el expediente; cliente abre incidencia, profesional responde y administración revisa y cierra.
3. **Herramienta profesional:** edición de perfil, servicio y reglas de horario; creación de cliente propio y cita manual; comprobación de captación cero en el registro guardado; agenda a 390 px.
4. **Seguridad HTTP:** acceso anónimo rechazado; cuenta ajena sin acceso a expediente ni fotos; Origin ajeno rechazado; datos no válidos rechazados; SVG disfrazado y archivo corrupto rechazados; cierre de sesión invalida una cookie anterior.
5. **Trabajo finalizado:** una cita pasada preparada en la base de prueba permite verificar la finalización por la UI, consulta del historial y anotación del cobro. Se usa una fixture de tiempo para no esperar a una cita futura; no se simula un pago.
6. **Alta desde cero:** registro profesional desde formulario, edición de perfil, publicación de un trabajo anterior, creación del primer servicio y turno semanal, y comprobación de la ficha pública resultante.

Las pruebas usan `data/e2e-*.db`, su carpeta independiente `data/e2e-*-uploads/`, una clave temporal y puerto 3100. No reinician ni modifican la base demo normal. Las pruebas unitarias usan memoria o un directorio temporal propio. La comprobación del arranque normal solo lee las rutas públicas.

## Revisión visual

Se han inspeccionado capturas de escritorio y móvil de la landing, panel profesional, agenda y expediente. Se corrigieron el patrón SVG de la ilustración inicial, la composición de turnos estrechos y los artefactos de capturar una cabecera fija con desplazamiento animado. Los formularios separan el nombre del campo de su ayuda, asociada mediante `aria-describedby` cuando procede.

Capturas: `test-results/landing-desktop.png`, `landing-mobile.png`, `pro-dashboard-desktop.png`, `pro-agenda-mobile.png` y `request-mobile.png`. Informe de navegador: `playwright-report/index.html`. Estas capturas contienen datos ficticios de la base aislada de pruebas.

La comprobación automática de tamaños y las etiquetas no sustituyen una auditoría WCAG, una revisión con lectores de pantalla o pruebas en dispositivos físicos. Safari y Firefox no se han validado.

## Aviso de herramientas de desarrollo pendiente

El 3 de noviembre, la auditoría completa detecta [GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249), un aviso moderado de consumo excesivo de recursos en `minimatch`. El aviso se propaga a 16 paquetes de la cadena de ESLint; **no son 16 fallos distintos en la aplicación**. La auditoría excluyendo dependencias de desarrollo devuelve cero avisos.

La corrección oficial está en `minimatch` 11.0.1. La cadena actual del linter también utiliza interfaces antiguas de ese paquete; forzar globalmente la versión 11 no es una sustitución compatible. La sugerencia de `npm audit fix --force` incluye retroceder ESLint a una versión incompatible. No se han aplicado esas operaciones ni se ha ocultado el aviso. Los patrones de búsqueda que usa el linter proceden de la configuración del repositorio, no de formularios web.

ESLint 9.39.5 se mantiene por compatibilidad declarada con los plugins de la configuración de Next instalada; npm avisa de que esa línea ya no tiene soporte. Queda pendiente actualizar de forma conjunta la cadena de lint y volver a ejecutar sus reglas y auditoría. Esto debe revisarse antes de adoptar una cadena de integración pública o procesar repositorios y configuraciones no confiables.

## Límites de la validación

No se han hecho pruebas de carga prolongada, penetración externa, concurrencia distribuida, recuperación real de backups, integración con pagos o correo, verificación de identidad, ni revisión jurídica. La funcionalidad comprobada es la alpha local descrita en el README y `ESTADO.md`.
