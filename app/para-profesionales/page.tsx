import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  ContactRound,
  FileText,
  MessageCircle,
  Check,
} from "lucide-react";
export const metadata = { title: "Tu oficio, más fácil de gestionar" };
export default function ProLanding() {
  return (
    <>
      <section className="container section pro-intro">
        <span className="eyebrow">OFICERCA PARA PROFESIONALES</span>
        <h1>
          Menos papeleo.
          <br />
          Más tiempo para
          <br />
          <em>hacer lo tuyo.</em>
        </h1>
        <p>
          Una agenda para tu oficio, tus clientes y tus próximas buenas oportunidades. Útil incluso
          si todos tus clientes ya te conocen.
        </p>
        <Link className="btn primary" href="/acceso?modo=registro&rol=pro">
          Crear mi espacio profesional <ArrowRight size={18} />
        </Link>
        <span className="muted small-text">Alpha local sin pagos ni suscripciones.</span>
      </section>
      <section className="section-tint section">
        <div className="container">
          <div className="feature-grid">
            {[
              [
                CalendarDays,
                "Tu agenda, sin cruces",
                "Define tus turnos, descansos y vacaciones. Las citas reservan su hueco y las cancelaciones lo liberan.",
              ],
              [
                ContactRound,
                "Tus clientes siguen siendo tuyos",
                "Registra clientes habituales y añade sus citas. Su origen queda identificado, sin comisión de captación.",
              ],
              [
                FileText,
                "Presupuestos que dejan todo claro",
                "Detalla conceptos, envía una propuesta y conserva cada versión y la aceptación del cliente.",
              ],
              [
                MessageCircle,
                "Cada trabajo tiene su conversación",
                "Solicitudes, fotos, mensajes y acuerdos juntos. Pide una inspección cuando no se pueda valorar a distancia.",
              ],
            ].map(([Icon, title, body]) => {
              const Component = Icon as typeof CalendarDays;
              return (
                <article className="panel-card" key={title as string}>
                  <Component size={27} />
                  <h2>{title as string}</h2>
                  <p>{body as string}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>
      <section className="container section narrow">
        <span className="eyebrow">UNA HERRAMIENTA QUE RESPETA TU OFICIO</span>
        <h2>Tú decides cómo trabajas.</h2>
        <ul className="check-list large">
          <li>
            <Check />
            Confirmación manual o automática de citas.
          </li>
          <li>
            <Check />
            Precios orientativos, cerrados o después del diagnóstico.
          </li>
          <li>
            <Check />
            Clientes propios y solicitudes del marketplace identificados.
          </li>
          <li>
            <Check />
            Sin mover citas sin tu autorización.
          </li>
        </ul>
        <p>
          El plan gratuito y una futura opción premium forman parte del modelo en estudio. Las
          hipótesis de 14,90 €/mes y un 8 % por nuevos trabajos no son tarifas definitivas y no
          generan cargos en esta alpha.
        </p>
        <Link href="/acceso?modo=registro&rol=pro" className="btn primary">
          Organizar mi primer trabajo <ArrowRight size={18} />
        </Link>
      </section>
    </>
  );
}
