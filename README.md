# OFICERCA · Alpha 0.1

Prototipo web local para gestionar servicios de fontanería doméstica no urgente en Cáceres. Combina la búsqueda de profesionales con una herramienta de solicitudes, presupuestos y agenda.

## Contexto y participación

Proyecto personal de aprendizaje y exploración de producto. Hernán participó en la definición de la propuesta de valor y la priorización de funcionalidades para clientes y profesionales.

La alpha usa perfiles ficticios identificados como DEMO. No se presentan usuarios reales, ingresos ni validación comercial. No se ha desplegado esta aplicación completa como servicio público; una landing o maqueta pública, si existe, es una versión distinta.

## Funcionalidades implementadas

- Búsqueda, filtros, comparación y perfiles de profesionales.
- Registro y acceso con roles de cliente, profesional y administración.
- Solicitudes con fotografías privadas y conversación persistente.
- Presupuestos versionados, aceptación y reserva de citas.
- Agenda, horarios, descansos, bloqueos y prevención de reservas solapadas.
- Gestión de clientes propios, cancelaciones, finalización e incidencias.
- Persistencia en SQLite, migraciones y pruebas de dominio y navegador.

## Tecnología

Next.js, React, TypeScript y SQLite nativo de Node.js. Validación con Zod, sesiones con iron-session, contraseñas con bcrypt y tratamiento horario con Temporal. Las versiones están fijadas en `package-lock.json`.

## Arranque local

Requisitos: Node.js 24 o posterior, npm y un navegador. El entorno documentado es Windows.

```sh
npm ci
npm run setup
npm run dev
```

Abre `http://localhost:3000` y utiliza ese origen exacto. `setup` genera una clave de sesión aleatoria en `.env.local`, aplica migraciones y crea una base de demostración local. No copies `.env.example` sobre una configuración existente ni publiques `.env.local`.

La pantalla de acceso permite rellenar las cuentas ficticias de demostración. Sus credenciales son públicas por diseño del entorno local; no deben utilizarse en otros servicios. Solo se permite el acceso demo con `DEMO_MODE=true` y origen local. No publiques una instancia con cuentas demo habilitadas.

Los datos nuevos y los archivos subidos se generan en `data/`, que está excluido de Git. El repositorio no contiene la base personal del autor ni fotografías privadas. Para probar varios roles, utiliza ventanas privadas o perfiles separados del navegador.

## Estructura

| Carpeta | Contenido |
| --- | --- |
| `app/`, `components/` | Rutas, interfaz y formularios |
| `lib/` | Datos, permisos, sesiones, reglas y disponibilidad |
| `migrations/` | Esquema de base de datos |
| `scripts/` | Preparación, migraciones, demo y servidor de pruebas |
| `tests/`, `e2e/` | Pruebas de dominio, concurrencia y navegador |
| `docs/` | Arquitectura, estado y registro histórico de validación |

## Comprobaciones

```sh
npm run typecheck
npm run lint
npm test
npm run build
```

Para los recorridos de navegador:

```sh
npx playwright install chromium
npm run test:e2e
```

Los E2E usan un puerto y una base independientes. Consulta [el registro histórico de validación](docs/VALIDACION.md): documenta 32 pruebas de dominio y seis recorridos aprobados el 3 de noviembre de 2026. Esos resultados pertenecen a aquella ejecución; no se han vuelto a ejecutar al preparar esta copia pública.

## Límites

- Prototipo local para un único proceso Node con SQLite; no es un servicio listo para producción.
- No procesa pagos reales, no integra videollamadas ni realiza diagnóstico automático.
- Sin recuperación de cuenta por correo, verificación de identidad ni notificaciones externas.
- Sin evidencia de entrevistas o pruebas con usuarios reales ni validación comercial.
- Las pruebas de navegador documentadas usan Chromium; no acreditan todos los navegadores o dispositivos físicos.

Más detalle: [arquitectura](docs/ARQUITECTURA.md), [estado funcional](docs/ESTADO.md) y [validación histórica](docs/VALIDACION.md).
