"use client";
import { useState } from "react";
import type {
  Professional,
  Schedule,
  Service,
  Exception,
  OwnClient,
  Booking,
  User,
  PortfolioItem,
} from "@/lib/types";
import { ActionButton, ActionForm, Empty, Field, num, toCents, val } from "./ui";
import { dateTime } from "@/lib/format";
import { localInputInstant } from "@/lib/client-time";
import { BookingList } from "./bookings";
import { Plus, Trash2 } from "lucide-react";

export function ProfileEditor({ professional: p }: { professional: Professional }) {
  return (
    <ActionForm
      action="profile.save"
      data={(f) => ({
        name: val(f, "name"),
        specialty: val(f, "specialty"),
        bio: val(f, "bio"),
        experience: num(f, "experience"),
        remote: f.has("remote"),
        zones: val(f, "zones")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      })}
      submitLabel="Guardar mi perfil"
    >
      <div className="form-grid">
        <Field label="Nombre comercial">
          <input name="name" defaultValue={p.name} required minLength={2} maxLength={100} />
        </Field>
        <Field label="Especialidad">
          <input
            name="specialty"
            defaultValue={p.specialty}
            required
            minLength={3}
            maxLength={140}
          />
        </Field>
      </div>
      <Field label="Cuéntales cómo trabajas">
        <textarea
          name="bio"
          defaultValue={p.bio}
          required
          minLength={15}
          maxLength={3000}
          rows={5}
        />
      </Field>
      <div className="form-grid">
        <Field label="Años de experiencia declarada">
          <input
            name="experience"
            type="number"
            defaultValue={p.experience}
            required
            min={0}
            max={70}
          />
        </Field>
        <Field label="Zonas de cobertura" hint="Separadas por comas; sin dirección exacta.">
          <input name="zones" defaultValue={p.zones?.join(", ")} required />
        </Field>
      </div>
      <label className="check-label">
        <input type="checkbox" name="remote" defaultChecked={!!p.remote} />
        Ofrezco consultas remotas por mensajes y fotografías
      </label>
      <p className="muted small-text">
        Tu avatar utiliza las iniciales del nombre comercial. Las cuentas demo conservan su
        identificación de prueba.
      </p>
    </ActionForm>
  );
}
export function ServiceEditor({ service: s }: { service?: Service }) {
  const [type, setType] = useState(s?.price_type || "from");
  return (
    <ActionForm
      action="service.save"
      data={(f) => ({
        id: s?.id,
        name: val(f, "name"),
        description: val(f, "description"),
        price_cents: type === "diagnosis" ? null : toCents(f, "price"),
        price_type: type,
        duration: num(f, "duration"),
        mode: val(f, "mode"),
        requirements: val(f, "requirements"),
      })}
      submitLabel={s ? "Guardar servicio" : "Crear servicio"}
    >
      <div className="form-grid">
        <Field label="Nombre del servicio">
          <input name="name" defaultValue={s?.name} required minLength={3} maxLength={120} />
        </Field>
        <Field label="Modalidad">
          <select name="mode" defaultValue={s?.mode || "onsite"}>
            <option value="onsite">Presencial</option>
            <option value="remote">Consulta remota</option>
          </select>
        </Field>
      </div>
      <Field label="Descripción y alcance">
        <textarea name="description" defaultValue={s?.description} maxLength={1500} rows={2} />
      </Field>
      <div className="form-grid three">
        <Field label="Tipo de precio">
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="from">Orientativo, desde</option>
            <option value="fixed">Precio cerrado</option>
            <option value="diagnosis">Tras diagnóstico</option>
          </select>
        </Field>
        {type !== "diagnosis" && (
          <Field label="Importe total (€)">
            <input
              type="number"
              name="price"
              defaultValue={(s?.price_cents || 0) / 100}
              min={0}
              max={100000}
              step="0.01"
              required
            />
          </Field>
        )}
        <Field
          label={
            type === "diagnosis"
              ? "Minutos de la visita de valoración"
              : "Duración orientativa (min)"
          }
        >
          <input
            type="number"
            name="duration"
            defaultValue={s?.duration || 60}
            min={15}
            max={480}
            required
          />
        </Field>
      </div>
      <Field label="Antes de reservar">
        <input name="requirements" defaultValue={s?.requirements} maxLength={1000} />
      </Field>
      <small>
        Incluye impuestos y gastos en la tarifa publicada. El importe definitivo se acuerda en el
        presupuesto. Para servicios pendientes de diagnóstico, la duración solo corresponde a la
        visita de valoración.
      </small>
    </ActionForm>
  );
}
const days = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const hm = (m: number) =>
  `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
const minutes = (s: string) => {
  const [h, m] = s.split(":").map(Number);
  return h * 60 + m;
};
export function ScheduleEditor({
  professional: p,
  schedule,
  exceptions,
}: {
  professional: Professional;
  schedule: Schedule[];
  exceptions: Exception[];
}) {
  const [shifts, setShifts] = useState(
    schedule.map((s) => ({
      weekday: s.weekday,
      start_minute: s.start_minute,
      end_minute: s.end_minute,
    })),
  );
  return (
    <div className="stack">
      <div className="panel-card">
        <h2>Tu semana de trabajo</h2>
        <p className="muted">
          Zona horaria Europe/Madrid. Los cambios se aplican a nuevos huecos; las citas existentes
          se conservan.
        </p>
        <ActionForm
          action="schedule.save"
          data={(f) => ({
            shifts,
            min_notice: num(f, "notice"),
            gap: num(f, "gap"),
            cancel_hours: num(f, "cancel"),
            auto_confirm: f.has("auto"),
          })}
          submitLabel="Guardar disponibilidad"
        >
          <div className="weekly-editor">
            {days.map((day, dayIndex) => (
              <div key={day} className="weekly-row">
                <strong>{day}</strong>
                <div>
                  {shifts.map((s, i) =>
                    s.weekday === dayIndex + 1 ? (
                      <div className="shift" key={i}>
                        <input
                          type="time"
                          aria-label={`Inicio ${day} turno ${i + 1}`}
                          required
                          value={hm(s.start_minute)}
                          onChange={(e) =>
                            setShifts(
                              shifts.map((v, j) =>
                                j === i ? { ...v, start_minute: minutes(e.target.value) } : v,
                              ),
                            )
                          }
                        />
                        <span>a</span>
                        <input
                          type="time"
                          aria-label={`Fin ${day} turno ${i + 1}`}
                          required
                          value={hm(s.end_minute)}
                          onChange={(e) =>
                            setShifts(
                              shifts.map((v, j) =>
                                j === i ? { ...v, end_minute: minutes(e.target.value) } : v,
                              ),
                            )
                          }
                        />
                        <button
                          type="button"
                          className="icon-btn"
                          aria-label={`Quitar turno de ${day}`}
                          onClick={() => setShifts(shifts.filter((_, j) => j !== i))}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    ) : null,
                  )}
                  {!shifts.some((s) => s.weekday === dayIndex + 1) && (
                    <span className="muted small-text">Día de descanso</span>
                  )}
                </div>
                <button
                  className="icon-btn"
                  type="button"
                  aria-label={`Añadir turno ${day}`}
                  onClick={() =>
                    setShifts([
                      ...shifts,
                      { weekday: dayIndex + 1, start_minute: 540, end_minute: 840 },
                    ])
                  }
                >
                  <Plus size={17} />
                </button>
              </div>
            ))}
          </div>
          <div className="form-grid three">
            <Field label="Antelación mínima (min)">
              <input
                name="notice"
                type="number"
                min={0}
                max={10080}
                defaultValue={p.min_notice}
                required
              />
            </Field>
            <Field label="Descanso entre citas (min)">
              <input name="gap" type="number" min={0} max={120} defaultValue={p.gap} required />
            </Field>
            <Field label="Cancelación del cliente (h)">
              <input
                name="cancel"
                type="number"
                min={0}
                max={168}
                defaultValue={p.cancel_hours}
                required
              />
            </Field>
          </div>
          <label className="check-label">
            <input type="checkbox" name="auto" defaultChecked={!!p.auto_confirm} />
            Confirmar nuevas reservas automáticamente
          </label>
          <small>
            Sin confirmación automática, la cita queda pendiente y bloquea el hueco hasta que la
            confirmes o canceles.
          </small>
        </ActionForm>
      </div>
      <div className="panel-card">
        <h2>Vacaciones, excepciones y bloqueos</h2>
        <p className="muted">Bloquea un intervalo sin mover citas de otros clientes.</p>
        <ActionForm
          action="exception.create"
          data={(f) => ({
            startsAt: localInputInstant(val(f, "start")),
            endsAt: localInputInstant(val(f, "end")),
            reason: val(f, "reason"),
          })}
          reset
          submitLabel="Bloquear este intervalo"
        >
          <div className="form-grid">
            <Field label="Desde · Madrid">
              <input type="datetime-local" name="start" required />
            </Field>
            <Field label="Hasta · Madrid">
              <input type="datetime-local" name="end" required />
            </Field>
          </div>
          <Field label="Motivo privado">
            <input
              name="reason"
              required
              minLength={3}
              maxLength={160}
              placeholder="Vacaciones, cita personal, descanso…"
            />
          </Field>
        </ActionForm>
        <div className="exception-list">
          {exceptions.map((e) => (
            <div key={e.id}>
              <span>
                <strong>{e.reason}</strong>
                <small>
                  {dateTime(e.starts_at)} → {dateTime(e.ends_at)}
                </small>
              </span>
              <ActionButton
                action="exception.delete"
                data={{ id: e.id }}
                className="btn secondary small"
              >
                Quitar bloqueo
              </ActionButton>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
export function ClientForm({ client: c }: { client?: OwnClient }) {
  return (
    <ActionForm
      action="client.save"
      data={(f) => ({
        id: c?.id,
        name: val(f, "name"),
        email: val(f, "email"),
        phone: val(f, "phone"),
        notes: val(f, "notes"),
      })}
      submitLabel={c ? "Guardar ficha" : "Añadir cliente"}
      reset={!c}
    >
      <Field label="Nombre">
        <input name="name" required minLength={2} maxLength={100} defaultValue={c?.name} />
      </Field>
      <div className="form-grid">
        <Field label="Correo · opcional">
          <input type="email" name="email" defaultValue={c?.email} maxLength={254} />
        </Field>
        <Field label="Teléfono · opcional">
          <input name="phone" type="tel" maxLength={30} defaultValue={c?.phone} />
        </Field>
      </div>
      <Field label="Notas privadas">
        <textarea name="notes" defaultValue={c?.notes} rows={3} maxLength={3000} />
      </Field>
      <small>
        Solo tú puedes ver esta ficha. Añade los datos mínimos necesarios y evita información
        sensible.
      </small>
    </ActionForm>
  );
}
export function ClientsView({
  clients,
  bookings,
  user,
}: {
  clients: OwnClient[];
  bookings: Booking[];
  user: User;
}) {
  return (
    <div className="two-columns">
      <div>
        <div className="panel-card">
          <h2>Tus clientes de siempre</h2>
          <p>Captación 0 %. Estas fichas no crean cuentas de usuario.</p>
          {!clients.length && (
            <Empty title="Tu cartera empieza aquí">
              Añade tu primer cliente y podrás organizar sus visitas desde la agenda.
            </Empty>
          )}
          {clients.map((c) => (
            <details className="client-detail" key={c.id}>
              <summary>
                <span>
                  <strong>{c.name}</strong>
                  <small>
                    {[c.phone, c.email].filter(Boolean).join(" · ") ||
                      "Sin datos de contacto añadidos"}
                  </small>
                </span>
              </summary>
              <ClientForm client={c} />
              <h3>Citas e historial</h3>
              <BookingList
                bookings={bookings.filter((b) => b.own_client_id === c.id)}
                user={user}
              />
            </details>
          ))}
        </div>
      </div>
      <aside className="panel-card">
        <h2>Añadir cliente propio</h2>
        <ClientForm />
      </aside>
    </div>
  );
}
export function PortfolioEditor({ items }: { items: PortfolioItem[] }) {
  function editor(item?: PortfolioItem) {
    return (
      <ActionForm
        action="portfolio.save"
        data={(f) => ({ id: item?.id, title: val(f, "title"), description: val(f, "description") })}
        reset={!item}
        submitLabel={item ? "Guardar trabajo publicado" : "Publicar trabajo"}
      >
        <Field label="Título del trabajo">
          <input name="title" defaultValue={item?.title} required minLength={3} maxLength={140} />
        </Field>
        <Field label="Qué realizaste">
          <textarea
            name="description"
            defaultValue={item?.description}
            required
            minLength={15}
            maxLength={2000}
            rows={3}
          />
        </Field>
        <small>
          Publica solo trabajos propios sin datos privados de tus clientes. Los ejemplos demo
          conservan su identificación ficticia.
        </small>
      </ActionForm>
    );
  }
  return (
    <section className="portfolio-editor">
      <h2>Trabajos que quieres mostrar</h2>
      {items.map((item) => (
        <details className="service-edit-details" key={item.id}>
          <summary>{item.title}</summary>
          {editor(item)}
          <ActionButton
            action="portfolio.delete"
            data={{ id: item.id }}
            className="btn secondary small"
          >
            Retirar del perfil
          </ActionButton>
        </details>
      ))}
      <details className="service-edit-details">
        <summary>Añadir un trabajo anterior</summary>
        {editor()}
      </details>
    </section>
  );
}
