import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  Clock3,
  MapPin,
  MessageCircle,
  Star,
  Wrench,
} from "lucide-react";
import { profile } from "@/lib/queries";
import { initials, money } from "@/lib/format";
import { SlotPicker } from "@/components/slots";
export default async function ProfessionalPage({ params }: { params: Promise<{ slug: string }> }) {
  const data = profile((await params).slug);
  if (!data) notFound();
  const { professional: p, services, schedule, portfolio, reviews } = data;
  const time = (m: number) =>
    `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
  return (
    <div className="container section">
      <Link className="back-link" href="/profesionales">
        <ArrowLeft size={16} />
        Todos los profesionales
      </Link>
      <div className="profile-cover">
        <div className="profile-cover-lines" />
        <span>
          <Wrench size={26} /> OFICIOS QUE CUIDAN TU CASA
        </span>
      </div>
      <div className="profile-layout">
        <div>
          <div className="profile-identity">
            <div className="avatar avatar-xl">{initials(p.name)}</div>
            <div>
              {!!p.is_demo && <span className="demo-tag">PERFIL FICTICIO DE DEMOSTRACIÓN</span>}
              <h1>{p.name}</h1>
              <p>{p.specialty}</p>
              <span className="card-location">
                <MapPin size={15} />
                {p.zones?.join(" · ")}
              </span>
            </div>
          </div>
          <section className="profile-section">
            <span className="eyebrow">CONOCE A TU PROFESIONAL</span>
            <h2>Manos expertas. Trato cercano.</h2>
            <p>{p.bio}</p>
            <div className="card-chips">
              <span>{p.experience} años de experiencia declarada</span>
              <span>{p.remote ? "Consulta presencial y remota" : "Atención presencial"}</span>
            </div>
            <p className="muted small-text">
              La experiencia es declarada por el profesional. No se ha realizado una verificación de
              identidad.
            </p>
          </section>
          <section className="profile-section">
            <h2>En qué puedo ayudarte</h2>
            <div className="service-list">
              {services.map((s) => (
                <article className="service-row" key={s.id}>
                  <div>
                    <h3>{s.name}</h3>
                    <p>{s.description}</p>
                    <span className="small-text muted">
                      <Clock3 size={13} />
                      {s.duration} min{" "}
                      {s.price_type === "diagnosis"
                        ? "para la visita de valoración"
                        : "orientativos"}{" "}
                      · {s.mode === "remote" ? "Remoto por mensajes" : "Presencial"}
                    </span>
                    {s.requirements && <small>{s.requirements}</small>}
                  </div>
                  <div className="service-price">
                    <strong>
                      {s.price_type === "diagnosis"
                        ? "A valorar"
                        : `${s.price_type === "from" ? "Desde " : ""}${money(s.price_cents || 0)}`}
                    </strong>
                    <Link
                      href={`/solicitar?profesional=${p.id}&servicio=${s.id}`}
                      className="text-link"
                    >
                      Consultar <ArrowRight size={15} />
                    </Link>
                  </div>
                </article>
              ))}
            </div>
            {!services.length && (
              <p>Este profesional está preparando sus servicios. Puedes enviarle una consulta.</p>
            )}
          </section>
          <section className="profile-section">
            <h2>Horarios habituales</h2>
            <p className="muted">
              Horarios de Europe/Madrid. Los huecos disponibles descuentan citas, descansos y
              bloqueos.
            </p>
            <div className="schedule-public">
              {["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"].map(
                (day, i) => (
                  <div key={day}>
                    <span>{day}</span>
                    <strong>
                      {schedule
                        .filter((s) => s.weekday === i + 1)
                        .map((s) => `${time(s.start_minute)}–${time(s.end_minute)}`)
                        .join(" · ") || "Descanso"}
                    </strong>
                  </div>
                ),
              )}
            </div>
          </section>
          <section className="profile-section">
            <h2>Trabajos anteriores</h2>
            {portfolio.length ? (
              portfolio.map((item) => (
                <article className="portfolio-item" key={item.id}>
                  <span className="step-icon">
                    <Wrench />
                  </span>
                  <div>
                    <h3>{item.title}</h3>
                    <p>{item.description}</p>
                    {!!item.is_demo && <span className="demo-tag">EJEMPLO FICTICIO</span>}
                  </div>
                </article>
              ))
            ) : (
              <p>Aún no hay trabajos publicados.</p>
            )}
          </section>
          <section className="profile-section">
            <h2>Opiniones de trabajos completados</h2>
            {reviews.length ? (
              reviews.map((r) => (
                <article className="review" key={r.id}>
                  <strong>{r.author_name}</strong>
                  <span className="rating">
                    <Star size={14} />
                    {r.rating}/5
                  </span>
                  <p>{r.body}</p>
                  <small>
                    Vinculada a una reserva completada{p.is_demo ? " de demostración" : ""}.
                  </small>
                </article>
              ))
            ) : (
              <p className="muted">
                Todavía no hay reseñas. Solo se podrán publicar después de un trabajo completado en
                la plataforma.
              </p>
            )}
          </section>
        </div>
        <aside className="profile-aside">
          <div className="panel-card sticky">
            <span className="eyebrow">EL PRIMER PASO ES HABLAR</span>
            <h2>Cuéntame qué ocurre.</h2>
            <p>No hace falta que conozcas la solución. Empecemos por el problema.</p>
            <Link className="btn primary full" href={`/solicitar?profesional=${p.id}`}>
              <MessageCircle size={18} />
              Enviar una consulta
            </Link>
            <Link className="btn secondary full" href={`/solicitar?profesional=${p.id}`}>
              <CalendarDays size={18} />
              Solicitar una reserva
            </Link>
            <ul className="check-list">
              <li>
                <Check size={15} />
                Presupuesto antes de reservar
              </li>
              <li>
                <Check size={15} />
                {p.auto_confirm ? "Confirmación automática" : "Confirmación por el profesional"}
              </li>
              <li>
                <Check size={15} />
                Cancelación con {p.cancel_hours} h de antelación
              </li>
            </ul>
            {services.length > 0 && (
              <details>
                <summary>Consultar huecos disponibles</summary>
                <SlotPicker professionalId={p.id} services={services} />
                <small>Para reservar, envía una solicitud y acepta el presupuesto.</small>
              </details>
            )}
            <p className="muted small-text">
              Servicio no urgente. Las tarifas se concretan por escrito. La alpha no procesa pagos.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
