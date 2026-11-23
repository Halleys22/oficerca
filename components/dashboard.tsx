"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ArrowUpRight,
  Bell,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  ContactRound,
  FileText,
  History,
  House,
  Link2,
  MessageCircle,
  Plus,
  Settings2,
  UserRound,
  Wrench,
} from "lucide-react";
import type { Workspace } from "@/lib/types";
import { dateTime, initials } from "@/lib/format";
import { dayKey, nextDate } from "@/lib/client-time";
import { ActionButton, Empty, Status } from "./ui";
import { BookingList, ManualAppointment } from "./bookings";
import {
  ClientsView,
  ProfileEditor,
  ScheduleEditor,
  ServiceEditor,
  PortfolioEditor,
} from "./pro-editors";
import { IncidentView } from "./incidents";
import { useClock } from "./use-clock";

const proTabs = [
  ["resumen", "Mi día", House],
  ["agenda", "Agenda", CalendarDays],
  ["solicitudes", "Solicitudes", MessageCircle],
  ["clientes", "Mis clientes", ContactRound],
  ["servicios", "Servicios y tarifas", Wrench],
  ["disponibilidad", "Disponibilidad", Settings2],
  ["perfil", "Mi perfil", UserRound],
  ["historial", "Historial", History],
  ["notificaciones", "Notificaciones", Bell],
] as const;
const clientTabs = [
  ["resumen", "Mi espacio", House],
  ["solicitudes", "Mis solicitudes", MessageCircle],
  ["agenda", "Mis citas", CalendarDays],
  ["historial", "Historial", History],
  ["notificaciones", "Notificaciones", Bell],
] as const;
const adminTabs = [
  ["incidencias", "Incidencias", CircleHelp],
  ["notificaciones", "Notificaciones", Bell],
] as const;
export function Dashboard({ data, tab = "resumen" }: { data: Workspace; tab?: string }) {
  const now = useClock();
  const { user, professional: p } = data;
  const router = useRouter();
  const tabs = user.role === "pro" ? proTabs : user.role === "admin" ? adminTabs : clientTabs;
  const validTab = tabs.some((t) => t[0] === tab) ? tab : tabs[0][0];
  const [copied, setCopied] = useState("");
  useEffect(() => {
    const t = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, 20_000);
    return () => clearInterval(t);
  }, [router]);
  const active = data.bookings.filter((b) => ["pending", "confirmed"].includes(b.status)),
    upcoming = active.filter((b) => b.ends_at > now);
  const requests = data.requests.filter((r) => !["completed", "cancelled"].includes(r.status));
  const pending = requests.filter((r) => r.status === "new");
  const unanswered = requests.filter(
    (r) => r.status === "new" || (r.last_sender_id && r.last_sender_id !== user.id),
  );
  return (
    <div className="workspace">
      <aside className="workspace-sidebar">
        <div className="workspace-person">
          <span className="avatar">{initials(user.name)}</span>
          <div>
            <strong>{user.name}</strong>
            <small>
              {user.role === "pro"
                ? "Espacio profesional"
                : user.role === "admin"
                  ? "Administración local"
                  : "Espacio personal"}
            </small>
          </div>
        </div>
        <nav aria-label="Secciones de tu espacio">
          {tabs.map(([key, label, Icon]) => (
            <Link
              key={key}
              href={`/panel?tab=${key}`}
              className={key === validTab ? "selected" : ""}
            >
              <Icon size={18} />
              {label}
              {key === "solicitudes" && pending.length > 0 && (
                <span className="nav-count">{pending.length}</span>
              )}
              {key === "notificaciones" && data.notifications.some((n) => !n.read_at) && (
                <span className="live-dot" />
              )}
            </Link>
          ))}
        </nav>
        {p && (
          <div className="sidebar-bottom">
            <span className="eyebrow">TU OFICIO, A UN ENLACE</span>
            <Link className="text-link" href={`/profesionales/${p.slug}`}>
              Ver mi perfil público <ArrowUpRight size={15} />
            </Link>
            <button
              className="text-link"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(`${location.origin}/profesionales/${p.slug}`);
                  setCopied("Enlace copiado.");
                } catch {
                  setCopied(`${location.origin}/profesionales/${p.slug}`);
                }
              }}
            >
              <Link2 size={15} />
              Copiar enlace para clientes
            </button>
            {copied && <small role="status">{copied}</small>}
          </div>
        )}
        <p className="sidebar-caption">
          ALPHA 0.1 · CÁCERES
          <br />
          Europe/Madrid
        </p>
      </aside>
      <div className="workspace-content">
        <div className="workspace-heading">
          <div>
            <span className="eyebrow">
              {new Intl.DateTimeFormat("es-ES", {
                weekday: "long",
                day: "numeric",
                month: "long",
                timeZone: "Europe/Madrid",
              }).format(new Date(now))}
            </span>
            <h1>
              {validTab === "resumen"
                ? `Hola, ${user.name.split(" ")[0]}.`
                : tabs.find((t) => t[0] === validTab)?.[1]}
            </h1>
            <p>
              {validTab === "resumen"
                ? user.role === "pro"
                  ? "Tu día de trabajo, un poco más sencillo."
                  : "Cada pequeño problema, un paso más cerca de resolverse."
                : "Lo que necesitas, en su sitio."}
            </p>
          </div>
          {p ? (
            <Link className="btn primary" href="/panel?tab=agenda#nueva-cita">
              <Plus size={17} />
              Nueva cita
            </Link>
          ) : user.role === "client" ? (
            <Link href="/solicitar" className="btn primary">
              Pedir ayuda <ArrowRight size={17} />
            </Link>
          ) : null}
        </div>
        {!!user.is_demo && (
          <p className="demo-note">
            <span className="demo-tag">DEMO</span> Estás trabajando con datos ficticios. Los cambios
            se guardan en este equipo.
          </p>
        )}
        {validTab === "resumen" && (
          <>
            <div className="dashboard-metrics">
              <Link href="/panel?tab=agenda">
                <CalendarDays size={20} />
                <strong>{upcoming.length}</strong>
                <span>Citas por delante</span>
              </Link>
              <Link href="/panel?tab=solicitudes">
                <MessageCircle size={20} />
                <strong>{user.role === "pro" ? unanswered.length : pending.length}</strong>
                <span>
                  {user.role === "pro" ? "Consultas por responder" : "Consultas recién enviadas"}
                </span>
              </Link>
              <Link href="/panel?tab=notificaciones">
                <Bell size={20} />
                <strong>{data.notifications.filter((n) => !n.read_at).length}</strong>
                <span>Avisos sin leer</span>
              </Link>
            </div>
            <div className="two-columns overview-columns">
              <div className="panel-card">
                <div className="section-heading compact">
                  <h2>Próximos trabajos</h2>
                  <Link className="text-link" href="/panel?tab=agenda">
                    Ver agenda <ArrowUpRight size={16} />
                  </Link>
                </div>
                <BookingList bookings={upcoming.slice(0, 4)} user={user} />
              </div>
              <div className="stack">
                <div className="panel-card">
                  <div className="section-heading compact">
                    <h2>Conversaciones abiertas</h2>
                    <MessageCircle size={19} />
                  </div>
                  <RequestRows requests={requests.slice(0, 4)} />
                </div>
                {p && (
                  <div className="tip-card">
                    <span className="eyebrow">TU SIGUIENTE HUECO</span>
                    <h3>Haz sitio para trabajar a tu manera.</h3>
                    <p>
                      Revisa la disponibilidad de tus servicios y configura cuándo quieres recibir
                      reservas.
                    </p>
                    <Link className="text-link" href="/panel?tab=disponibilidad">
                      Gestionar mis horarios <ArrowRight size={16} />
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
        {validTab === "solicitudes" && (
          <div className="panel-card">
            <h2>Todas tus solicitudes</h2>
            <RequestRows requests={data.requests} />
          </div>
        )}
        {validTab === "agenda" && (
          <>
            <Agenda data={data} />
            {p && (
              <div id="nueva-cita" className="panel-card manual-panel">
                <span className="eyebrow">CLIENTE PROPIO · CAPTACIÓN 0 %</span>
                <h2>Una cita para tus clientes de siempre.</h2>
                <ManualAppointment
                  professional={p}
                  services={data.services}
                  clients={data.clients}
                />
              </div>
            )}
          </>
        )}
        {validTab === "historial" && (
          <div className="panel-card">
            <h2>Trabajos y citas anteriores</h2>
            <BookingList
              bookings={[...data.bookings]
                .filter((b) => ["completed", "cancelled"].includes(b.status))
                .reverse()}
              user={user}
              history
            />
            <h2 className="subsection-title">Solicitudes cerradas</h2>
            <RequestRows
              requests={data.requests.filter((r) => ["completed", "cancelled"].includes(r.status))}
            />
          </div>
        )}
        {validTab === "clientes" && p && (
          <ClientsView clients={data.clients} bookings={data.bookings} user={user} />
        )}
        {validTab === "perfil" && p && (
          <div className="panel-card">
            <div className="section-heading">
              <h2>Así te verán tus clientes</h2>
              <Link className="text-link" href={`/profesionales/${p.slug}`}>
                Ver perfil <ArrowUpRight size={16} />
              </Link>
            </div>
            <ProfileEditor professional={p} />
            <PortfolioEditor items={data.portfolio} />
          </div>
        )}
        {validTab === "servicios" && p && (
          <div className="two-columns">
            <div className="panel-card">
              <h2>Servicios publicados</h2>
              {data.services.map((s) => (
                <details key={s.id} className="service-edit-details">
                  <summary>
                    <span>
                      <strong>{s.name}</strong>
                      <small>
                        {s.duration} min · {s.mode === "remote" ? "Remoto" : "Presencial"}
                      </small>
                    </span>
                  </summary>
                  <ServiceEditor service={s} />
                  <ActionButton
                    action="service.archive"
                    data={{ id: s.id }}
                    className="btn danger small"
                  >
                    Retirar del perfil
                  </ActionButton>
                </details>
              ))}
              {!data.services.length && (
                <Empty title="Publica tu primer servicio">
                  Podrás indicar una tarifa orientativa o valorar el trabajo después del
                  diagnóstico.
                </Empty>
              )}
            </div>
            <aside className="panel-card">
              <h2>Nuevo servicio</h2>
              <ServiceEditor />
            </aside>
          </div>
        )}
        {validTab === "disponibilidad" && p && (
          <ScheduleEditor professional={p} schedule={data.schedule} exceptions={data.exceptions} />
        )}
        {validTab === "notificaciones" && (
          <div className="panel-card">
            <div className="section-heading compact">
              <h2>Tus avisos</h2>
              <ActionButton action="notifications.read" data={{}} className="btn secondary small">
                Marcar como leídos
              </ActionButton>
            </div>
            {!data.notifications.length ? (
              <Empty title="Todo tranquilo por aquí">
                Te avisaremos dentro de la aplicación cuando haya un mensaje, un presupuesto o un
                cambio de cita.
              </Empty>
            ) : (
              <div className="notices">
                {data.notifications.map((n) => (
                  <div key={n.id} className={n.read_at ? "notice" : "notice unread"}>
                    <Bell size={17} />
                    <div>
                      {n.request_id && user.role !== "admin" ? (
                        <Link href={`/solicitudes/${n.request_id}`}>{n.body}</Link>
                      ) : (
                        <span>{n.body}</span>
                      )}
                      <small>{dateTime(n.created_at)}</small>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {validTab === "incidencias" && user.role === "admin" && (
          <>
            <div className="info-box">
              <CircleHelp size={21} />
              <p>
                Revisión administrativa de incidencias. Los mensajes privados generales, fotografías
                y notas de clientes propios están restringidos a sus participantes. Los cierres no
                realizan arbitraje legal ni procesan devoluciones.
              </p>
            </div>
            {!data.incidents.length ? (
              <Empty title="No hay incidencias pendientes">
                Las incidencias abiertas por clientes y profesionales aparecerán aquí con sus
                respuestas.
              </Empty>
            ) : (
              data.incidents.map((i) => <IncidentView key={i.id} incident={i} user={user} />)
            )}
          </>
        )}
      </div>
    </div>
  );
}
function RequestRows({ requests }: { requests: Workspace["requests"] }) {
  return requests.length ? (
    <div className="request-rows">
      {requests.map((r) => (
        <Link href={`/solicitudes/${r.id}`} key={r.id}>
          <span className="request-row-icon">
            <FileText size={19} />
          </span>
          <div>
            <strong>{r.title}</strong>
            <small>
              {r.client_name} · {r.professional_name}
            </small>
            <Status value={r.status} />
          </div>
          <ArrowUpRight size={19} />
        </Link>
      ))}
    </div>
  ) : (
    <Empty title="Sin solicitudes por aquí">
      Las conversaciones y sus próximos pasos aparecerán aquí.
    </Empty>
  );
}
function Agenda({ data }: { data: Workspace }) {
  const [date, setDate] = useState(dayKey());
  const week = Array.from({ length: 7 }, (_, i) => nextDate(date, i));
  const active = data.bookings.filter((b) => ["pending", "confirmed"].includes(b.status));
  return (
    <div className="panel-card">
      <div className="section-heading compact">
        <div>
          <h2>Tu agenda</h2>
          <p className="muted small-text">Citas pendientes y confirmadas · hora de Madrid</p>
        </div>
        <div className="calendar-controls">
          <button
            className="icon-btn"
            aria-label="Semana anterior"
            onClick={() => setDate(nextDate(date, -7))}
          >
            <ChevronLeft size={18} />
          </button>
          <input
            type="date"
            aria-label="Fecha de agenda"
            value={date}
            onChange={(e) => {
              if (e.target.value) setDate(e.target.value);
            }}
          />
          <button
            className="icon-btn"
            aria-label="Semana siguiente"
            onClick={() => setDate(nextDate(date, 7))}
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
      <div className="week-grid">
        {week.map((day) => {
          const bookings = active.filter((b) => dayKey(b.starts_at) === day);
          return (
            <div key={day} className={day === dayKey() ? "week-day today" : "week-day"}>
              <span>
                {new Intl.DateTimeFormat("es-ES", { weekday: "short", timeZone: "UTC" }).format(
                  new Date(day + "T12:00:00Z"),
                )}
              </span>
              <strong>{Number(day.slice(-2))}</strong>
              {bookings.length ? (
                <span className="calendar-count">
                  {bookings.length} cita{bookings.length > 1 ? "s" : ""}
                </span>
              ) : (
                <small>Sin citas</small>
              )}
            </div>
          );
        })}
      </div>
      <BookingList
        bookings={active.filter(
          (b) => dayKey(b.starts_at) >= date && dayKey(b.starts_at) <= week[6],
        )}
        user={data.user}
      />
      <details className="all-bookings">
        <summary>Ver todas las citas activas ({active.length})</summary>
        <BookingList bookings={active} user={data.user} />
      </details>
      <p className="muted small-text">
        Los huecos disponibles se calculan al crear una cita. Ver una fecha sin citas no garantiza
        disponibilidad fuera de los turnos de trabajo.
      </p>
    </div>
  );
}
