<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Convenciones de OFICERCA

## Alcance y autonomía

Aplicación local de fontanería no urgente en Cáceres. Mantener flujos completos y datos persistentes antes que extras. No añadir servicios de pago, cargos ni despliegues públicos sin autorización. Los datos demo deben seguir identificados; no publicar administradores con credenciales conocidas.

## Código y estructura

- TypeScript estricto. Componentes/rutas en `components/` y `app/`; lógica de negocio en `lib/`.
- No importar SQLite, secretos o módulos de cuentas desde componentes cliente. Las fechas y formatos de cliente tienen módulos separados.
- Todas las consultas usan parámetros. Los resultados SQLite se normalizan a objetos serializables en `lib/db.ts`.
- Cambiar el esquema con una migración numerada nueva; no editar una ya aplicada ni borrar datos para ocultar errores.
- Mantener unidades: dinero en céntimos enteros; instantes en milisegundos UTC; horarios semanales en minutos de Europe/Madrid.
- Mantener el formato de Prettier y la identidad visual: verde petróleo, blanco cálido, espacios amplios, formularios breves y estados accesibles.

## Invariantes de seguridad y negocio

- Validar entradas con Zod y autorizar cada lectura/mutación en servidor. Nunca confiar en un ID o rol enviado por la UI.
- Solo participantes acceden a mensajes y fotografías. Administración solo recibe los expedientes de incidencia y sus respuestas, no acceso general a conversaciones ni clientes propios.
- No exponer hashes, claves, `.env.local`, SQLite o uploads en `public/`, commits o salidas de herramientas.
- Mantener controles de Origin, cookie HttpOnly/SameSite, expiración, revocación y límites persistentes de abuso.
- No alterar la protección de solapamientos: comprobación de disponibilidad dentro de `BEGIN IMMEDIATE` y triggers de SQLite para inserción y actualización.
- Pendientes y confirmadas ocupan hueco; canceladas lo liberan sin borrado. Las citas propias conservan captación cero.
- Un presupuesto revisado requiere una nueva aceptación. Los trabajos pendientes de diagnóstico no reciben una duración definitiva de reparación.
- No modificar citas de otros clientes al cambiar turnos ni añadir vacaciones. Los bloqueos que invaden reservas se rechazan.
- Nunca representar estados administrativos de cobro como movimientos de dinero procesados.
- Usar Temporal y rechazar horas locales ambiguas/inexistentes. No convertir una fecha de Madrid con la zona horaria implícita del equipo.

## Verificación

Ejecutar `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`; para cambios de flujo, `npm run test:e2e`. No eliminar o debilitar pruebas para conseguir resultados verdes. Los E2E usan un SQLite separado en `data/e2e-*.db` y puerto 3100. No limpiar ni modificar la base demo al probar.

Las pruebas deben comprobar reglas o recorridos reales, especialmente autorización, aceptaciones y reservas simultáneas. Revisar móvil y escritorio cuando cambie diseño. Mantener `docs/ESTADO.md` y `docs/VALIDACION.md` fieles a lo realmente ejecutado. No afirmar aptitud para producción ni cumplimiento legal certificado.
