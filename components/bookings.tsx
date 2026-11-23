"use client";
import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight, CalendarDays, Check, Clock3 } from "lucide-react";
import type { Booking, OwnClient, Professional, Service, User } from "@/lib/types";
import { dateTime, labels, money, timeOnly } from "@/lib/format";
import { ActionButton, ActionForm, Empty, Field, Status, val } from "./ui";
import { SlotPicker } from "./slots";
import { useClock } from "./use-clock";

export function BookingList({
  bookings,
  user,
  history = false,
}: {
  bookings: Booking[];
  user: User;
  history?: boolean;
}) {
  const now = useClock();
  if (!bookings.length)
    return (
      <Empty
        title={history ? "Tu historial empieza con el primer trabajo" : "Todavía no hay citas aquí"}
        icon={<CalendarDays />}
      >
        {history
          ? "Cuando completes o canceles una cita, podrás consultarla aquí."
          : "Las reservas aparecerán aquí cuando tengan fecha. Los huecos pendientes de confirmación también quedan bloqueados."}
      </Empty>
    );
  return (
    <div className="booking-list">
      {bookings.map((b) => (
        <article className="booking-item" key={b.id}>
          <div className="booking-date">
            <CalendarDays size={18} />
            <strong>{dateTime(b.starts_at)}</strong>
            <span>
              {timeOnly(b.starts_at)}–{timeOnly(b.ends_at)}
            </span>
          </div>
          <div className="booking-info">
            <div className="inline">
              <h3>{b.title}</h3>
              <Status value={b.status} />
            </div>
            <p>
              {user.role === "pro" ? b.client_name : b.professional_name}
              <span className="dot-separator">·</span>
              {b.source === "own" ? "Cliente propio · captación 0 %" : "Solicitud desde OFICERCA"}
            </p>
            {b.amount_cents !== null && (
              <small>
                Importe acordado: {money(b.amount_cents)} ·{" "}
                {b.collection_status === "pending"
                  ? "Cobro pendiente"
                  : labels[b.collection_status]}
              </small>
            )}
            {b.notes && <p className="private-note">{b.notes}</p>}
            {b.cancellation_reason && <p className="muted">Motivo: {b.cancellation_reason}</p>}
            <div className="button-row">
              {b.request_id && (
                <Link className="text-link" href={`/solicitudes/${b.request_id}`}>
                  Abrir expediente <ArrowUpRight size={15} />
                </Link>
              )}
              {b.status === "pending" && user.role === "pro" && (
                <ActionButton
                  action="booking.status"
                  data={{ bookingId: b.id, status: "confirmed" }}
                  className="btn primary small"
                >
                  <Check size={15} />
                  Confirmar cita
                </ActionButton>
              )}
            </div>
            {["pending", "confirmed"].includes(b.status) && (
              <details className="manage-booking">
                <summary>Gestionar esta cita</summary>
                <div className="booking-management">
                  <ActionForm
                    action="booking.status"
                    data={(f) => ({
                      bookingId: b.id,
                      status: "cancelled",
                      reason: val(f, "reason"),
                    })}
                    submitLabel="Cancelar la cita"
                    success="Cita cancelada. El hueco se ha liberado."
                  >
                    <Field label="Motivo de la cancelación">
                      <textarea name="reason" required minLength={5} maxLength={1000} rows={2} />
                    </Field>
                    {user.role === "client" && (
                      <small>
                        Se aplica el plazo de cancelación del profesional. Si ha terminado, contacta
                        por mensajes o abre una incidencia.
                      </small>
                    )}
                  </ActionForm>
                  {user.role === "pro" && b.status === "confirmed" && b.ends_at <= now && (
                    <ActionForm
                      action="booking.status"
                      data={(f) => ({
                        bookingId: b.id,
                        status: "completed",
                        reason: val(f, "summary"),
                      })}
                      submitLabel="Finalizar trabajo"
                      success="Trabajo finalizado y guardado en el historial."
                    >
                      <Field label="Trabajo realizado">
                        <textarea
                          name="summary"
                          required
                          minLength={5}
                          maxLength={1000}
                          rows={2}
                          placeholder="Describe lo realizado y cualquier observación"
                        />
                      </Field>
                    </ActionForm>
                  )}
                </div>
              </details>
            )}
            {b.status === "completed" && user.role === "pro" && (
              <ActionForm
                className="inline-form"
                action="booking.collection"
                data={(f) => ({ bookingId: b.id, status: val(f, "collection") })}
                submitLabel="Anotar estado"
              >
                <Field label="Estado administrativo del cobro">
                  <select name="collection" defaultValue={b.collection_status}>
                    <option value="unrecorded">Sin registrar</option>
                    <option value="pending">Pendiente según el profesional</option>
                    <option value="recorded">Cobro anotado por el profesional</option>
                  </select>
                </Field>
                <small>No se procesa ni se acredita ningún pago.</small>
              </ActionForm>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}
export function ManualAppointment({
  professional,
  services,
  clients,
}: {
  professional: Professional;
  services: Service[];
  clients: OwnClient[];
}) {
  const [slot, setSlot] = useState(0),
    [sid, setSid] = useState(services[0]?.id || "");
  if (!clients.length || !services.length)
    return (
      <div className="info-box">
        <Clock3 size={20} />
        <p>Añade al menos un cliente propio y un servicio para crear citas manuales.</p>
      </div>
    );
  return (
    <ActionForm
      action="booking.manual"
      data={(f) => ({
        clientId: val(f, "client"),
        serviceId: sid,
        startsAt: slot,
        notes: val(f, "notes"),
      })}
      submitLabel="Añadir cita a la agenda"
      success="Cita guardada. El hueco ya está bloqueado y su captación es 0 %."
      onSuccess={() => setSlot(0)}
    >
      <Field label="Cliente propio">
        <select name="client" required>
          {clients.map((c) => (
            <option value={c.id} key={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </Field>
      <SlotPicker
        professionalId={professional.id}
        services={services}
        serviceId={sid}
        onServiceChange={(v) => {
          setSid(v);
          setSlot(0);
        }}
        onSelect={(v, s) => {
          setSlot(v);
          setSid(s);
        }}
        selected={slot}
      />
      <Field label="Notas privadas de la visita">
        <textarea name="notes" rows={2} maxLength={2000} />
      </Field>
      <p className="muted small-text">
        {slot ? `Selección: ${dateTime(slot)}` : "Selecciona un hueco para continuar."} · Cliente
        aportado por ti, sin comisión de captación.
      </p>
    </ActionForm>
  );
}
