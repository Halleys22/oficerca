export const metadata = { title: "Condiciones de la alpha y privacidad" };
export default function Conditions() {
  return (
    <article className="container section prose">
      <span className="eyebrow">ALPHA 0.1 · ENTORNO LOCAL</span>
      <h1>Las cosas claras, desde el principio.</h1>
      <p>
        OFICERCA es un prototipo funcional para fontanería doméstica no urgente en Cáceres. Este
        documento describe sus reglas de funcionamiento local; no acredita cumplimiento legal ni
        sustituye las condiciones que requeriría un servicio público.
      </p>
      <h2>Demostración y contratación</h2>
      <p>
        Los perfiles marcados «demo» son ficticios. Las cuentas de demostración sirven
        exclusivamente para pruebas locales. No representan profesionales activos, identidad
        verificada, trabajos reales ni opiniones reales.
      </p>
      <p>
        Una solicitud abre una conversación y no constituye una reserva. El profesional recopila
        información y puede requerir una inspección. El presupuesto muestra conceptos, importe total
        y notas. Los importes deben incluir impuestos, desplazamiento y otros gastos aplicables, o
        explicar claramente su alcance antes de la aceptación.
      </p>
      <h2>Presupuestos y cambios</h2>
      <p>
        Cada versión se conserva con su estado. Una nueva versión sustituye la anterior y requiere
        una nueva aceptación. La aplicación impide cambiar el presupuesto de una cita activa; para
        revisar su alcance hay que cancelar la cita, acordar una nueva versión y volver a reservar.
        La reparación pendiente de diagnóstico no tiene una duración definitiva; la duración de una
        visita de valoración solo reserva esa visita.
      </p>
      <h2>Agenda y cancelaciones</h2>
      <p>
        Las citas pendientes de confirmación también bloquean su horario. Se respetan turnos
        semanales, excepciones, antelación mínima y descanso. Las horas se presentan en
        Europe/Madrid. Los nuevos huecos se ofrecen hasta 90 días por adelantado.
      </p>
      <p>
        El cliente puede cancelar hasta la antelación indicada en el perfil profesional (24 horas en
        los perfiles demo). Pasado ese plazo, debe contactar con el profesional o abrir una
        incidencia. El profesional puede cancelar explicando el motivo. No se aplica ninguna
        penalización monetaria automática. La cancelación libera el hueco y conserva mensajes,
        documentos e historial. No hay lista de espera automática.
      </p>
      <p>
        Los cambios de horarios semanales no alteran citas ya creadas. Las vacaciones y bloqueos no
        pueden superponerse a una cita activa: primero hay que gestionar esa reserva. Los trabajos
        se marcan completados por el profesional tras su hora de finalización, con una descripción.
      </p>
      <h2>Dinero y modelo comercial</h2>
      <p>
        OFICERCA no procesa pagos, no emite facturas fiscales ni promete seguros, devoluciones o
        garantías financieras. Los importes y el estado del cobro son anotaciones administrativas
        declaradas. El 8 % de captación y 14,90 €/mes premium son hipótesis futuras; no originan
        deudas ni suscripciones. Los clientes aportados por el profesional tienen comisión de
        captación cero.
      </p>
      <h2>Incidencias</h2>
      <p>
        Ambos participantes pueden abrir incidencias vinculadas a una contratación, aportar su
        explicación y responder. Administración solo consulta el expediente de la incidencia y su
        conversación administrativa; no dispone de acceso general a mensajes privados ni notas de
        clientes propios. Una revisión o cierre administrativo no representa arbitraje legal ni
        movimiento de dinero.
      </p>
      <h2>Privacidad local</h2>
      <p>
        Se guardan nombre, correo, contraseña cifrada mediante hash, perfil, disponibilidad y
        registros de trabajo necesarios para probar la aplicación. Evita datos sensibles y utiliza
        datos ficticios en esta alpha. No se exige dirección exacta para explorar ni enviar una
        solicitud. Las fotografías quedan fuera de la carpeta pública y se eliminan sus metadatos al
        procesarlas. Solo los participantes acceden a conversaciones y fotografías.
      </p>
      <p>
        Los datos se conservan en la base SQLite y en la carpeta privada de archivos del equipo. No
        hay analítica de terceros ni correos automáticos. La única cookie funcional conserva una
        sesión cifrada de hasta 8 horas. Cerrar sesión revoca las sesiones anteriores de esa cuenta.
        Para borrar los datos locales, detén el servidor y sigue las instrucciones del README; no
        elimines archivos de otra aplicación.
      </p>
      <h2>Antes de una apertura pública</h2>
      <p>
        Se necesitan revisión legal y de seguridad, identificación del responsable, base jurídica y
        procedimientos de derechos y conservación, condiciones comerciales definitivas, verificación
        profesional, moderación, copias de seguridad, HTTPS, correo de recuperación y operación del
        servicio. La alpha no es un servicio de emergencias.
      </p>
    </article>
  );
}
