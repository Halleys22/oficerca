"use client";
/* eslint-disable @next/next/no-img-element -- Private images are authorized on each request and must bypass image optimization caches. */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import {
  ArrowLeft,
  Camera,
  Check,
  Clock3,
  FileText,
  MessageCircle,
  Plus,
  Send,
  Trash2,
} from "lucide-react";
import type { RequestDetail, User } from "@/lib/types";
import { dateTime, initials, labels, money } from "@/lib/format";
import {
  ActionButton,
  ActionForm,
  apiAction,
  Empty,
  Feedback,
  Field,
  num,
  Status,
  Submit,
  val,
} from "./ui";
import { SlotPicker } from "./slots";
import { BookingList } from "./bookings";
import { IncidentView } from "./incidents";

export function RequestRoom({ data, user }: { data: RequestDetail; user: User }) {
  const { request: r, professional: p } = data;
  const isPro = user.id === p.user_id,
    closed = ["completed", "cancelled"].includes(r.status);
  const activeBooking = data.bookings.some((b) => ["pending", "confirmed"].includes(b.status));
  const accepted = data.quotes.find((q) => q.status === "accepted");
  const router = useRouter();
  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, 8_000);
    return () => clearInterval(timer);
  }, [router]);
  return (
    <div className="container section request-page">
      <Link href="/panel?tab=solicitudes" className="back-link">
        <ArrowLeft size={16} />
        Mis solicitudes
      </Link>
      <div className="request-page-heading">
        <div>
          <span className="eyebrow">EXPEDIENTE {r.id.slice(0, 8).toUpperCase()}</span>
          <h1>{r.title}</h1>
          <p>
            Con {isPro ? r.client_name : r.professional_name} ·{" "}
            {r.mode === "remote" ? "Consulta remota" : "Atención presencial"}
          </p>
        </div>
        <Status value={r.status} />
      </div>
      <div className="request-progress" aria-label="Progreso de la solicitud">
        {[
          ["Consulta", true],
          ["Propuesta", data.quotes.length > 0],
          ["Cita", data.bookings.length > 0],
          ["Trabajo realizado", r.status === "completed"],
        ].map(([label, done], i) => (
          <div key={label as string} className={done ? "done" : ""}>
            <span>{done ? <Check size={14} /> : i + 1}</span>
            {label as string}
          </div>
        ))}
      </div>
      <div className="request-room-layout">
        <div className="stack">
          <section className="panel-card conversation-panel">
            <div className="section-heading compact">
              <h2>
                <MessageCircle size={20} />
                La conversación
              </h2>
              <span className="small-text muted">
                <span className="live-dot" />
                Se actualiza cada 8 s
              </span>
            </div>
            <div className="request-original">
              <span className="eyebrow">LO QUE NOS CUENTAS</span>
              <p className="preserve">{r.description}</p>
              <div className="card-chips">
                {(JSON.parse(r.symptoms) as string[]).map((s) => (
                  <span key={s}>{s}</span>
                ))}
              </div>
              <small>{dateTime(r.created_at)}</small>
            </div>
            <div className="messages" aria-label="Mensajes de la conversación">
              {!data.messages.length ? (
                <Empty title="El primer mensaje acerca la solución">
                  Tu consulta ya está enviada. Puedes añadir información o una fotografía mientras
                  esperas la respuesta del profesional.
                </Empty>
              ) : (
                data.messages.map((m) => (
                  <article
                    key={m.id}
                    className={m.sender_id === user.id ? "message mine" : "message"}
                  >
                    <span className="avatar avatar-small">{initials(m.sender_name)}</span>
                    <div>
                      <div className="message-meta">
                        <strong>{m.sender_id === user.id ? "Tú" : m.sender_name}</strong>
                        <time dateTime={new Date(m.created_at).toISOString()}>
                          {dateTime(m.created_at)}
                        </time>
                      </div>
                      <p className="preserve">{m.body}</p>
                      {data.attachments
                        .filter((a) => a.message_id === m.id)
                        .map((a) => (
                          <a
                            key={a.id}
                            href={`/api/attachments/${a.id}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <img
                              className="message-photo"
                              src={`/api/attachments/${a.id}`}
                              alt={a.name}
                            />
                          </a>
                        ))}
                    </div>
                  </article>
                ))
              )}
            </div>
            <MessageComposer requestId={r.id} />
          </section>
          <section className="panel-card">
            <div className="section-heading compact">
              <h2>
                <Camera size={20} />
                Fotografías del expediente
              </h2>
              <span className="small-text muted">Solo para los participantes</span>
            </div>
            {data.attachments.length ? (
              <div className="attachment-grid">
                {data.attachments.map((a) => (
                  <a href={`/api/attachments/${a.id}`} key={a.id} target="_blank" rel="noreferrer">
                    <img src={`/api/attachments/${a.id}`} alt={a.name} />
                    <span>{a.name}</span>
                  </a>
                ))}
              </div>
            ) : (
              <p className="muted">
                Todavía no hay fotografías. Una imagen puede ayudar a preparar la visita.
              </p>
            )}
            <PhotoUpload requestId={r.id} />
          </section>
          <section className="panel-card">
            <div className="section-heading compact">
              <h2>
                <FileText size={20} />
                Presupuestos y acuerdos
              </h2>
              <span className="small-text muted">Todas las versiones se conservan</span>
            </div>
            {data.quotes.length ? (
              data.quotes.map((q) => (
                <article className={`quote-card quote-${q.status}`} key={q.id}>
                  <div className="section-heading compact">
                    <div>
                      <strong>Propuesta · versión {q.version}</strong>
                      <small>{dateTime(q.created_at)}</small>
                    </div>
                    <Status value={q.status} />
                  </div>
                  <div className="table-scroll">
                    <table>
                      <thead>
                        <tr>
                          <th>Concepto</th>
                          <th>Ud.</th>
                          <th>Precio</th>
                          <th>Importe</th>
                        </tr>
                      </thead>
                      <tbody>
                        {q.lines.map((l, i) => (
                          <tr key={l.id || i}>
                            <td>{l.description}</td>
                            <td>{l.quantity}</td>
                            <td>{money(l.unit_cents)}</td>
                            <td>{money(l.quantity * l.unit_cents)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="quote-total">
                    <span>Total acordable</span>
                    <strong>{money(q.total_cents)}</strong>
                  </div>
                  <p className="small-text muted">
                    Importe total declarado por el profesional, con impuestos y gastos aplicables
                    incluidos según el alcance descrito. OFICERCA no procesa pagos.
                  </p>
                  {q.notes && <p className="quote-notes preserve">{q.notes}</p>}
                  {!isPro && q.status === "sent" && (
                    <div className="button-row">
                      <ActionButton
                        action="quote.decide"
                        data={{ quoteId: q.id, decision: "accepted" }}
                        className="btn primary"
                      >
                        <Check size={16} />
                        Aceptar propuesta
                      </ActionButton>
                      <ActionButton
                        action="quote.decide"
                        data={{ quoteId: q.id, decision: "rejected" }}
                      >
                        Rechazar
                      </ActionButton>
                    </div>
                  )}
                </article>
              ))
            ) : (
              <Empty title="Primero, entender el problema">
                El profesional enviará aquí su propuesta cuando tenga información suficiente. Puede
                necesitar una inspección antes.
              </Empty>
            )}
            {isPro && !closed && !activeBooking && (
              <details className="quote-editor-details">
                <summary>
                  {data.quotes.length
                    ? "Preparar una nueva versión"
                    : "Preparar y enviar presupuesto"}
                </summary>
                <QuoteEditor requestId={r.id} />
              </details>
            )}
          </section>
          {data.bookings.length > 0 && (
            <section className="panel-card">
              <h2>
                <Clock3 size={20} />
                Citas de esta solicitud
              </h2>
              <BookingList bookings={data.bookings} user={user} />
            </section>
          )}
          {!isPro && accepted && !activeBooking && r.status === "accepted" && (
            <BookingForm data={data} />
          )}
          {!isPro &&
            r.status === "completed" &&
            !data.reviews.length &&
            data.bookings.some((b) => b.status === "completed") && (
              <section className="panel-card">
                <h2>¿Cómo ha ido?</h2>
                <ActionForm
                  action="review.create"
                  data={(f) => ({
                    bookingId: data.bookings.find((b) => b.status === "completed")!.id,
                    rating: num(f, "rating"),
                    body: val(f, "body"),
                  })}
                  submitLabel="Publicar reseña"
                >
                  <Field label="Tu valoración">
                    <select name="rating" defaultValue="5">
                      {[5, 4, 3, 2, 1].map((n) => (
                        <option key={n} value={n}>
                          {n} de 5
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Tu experiencia con el trabajo">
                    <textarea name="body" required minLength={10} maxLength={1200} rows={3} />
                  </Field>
                  {!!p.is_demo && (
                    <small>Esta reseña se vinculará a un trabajo ficticio de demostración.</small>
                  )}
                </ActionForm>
              </section>
            )}
          <section className="panel-card">
            <h2>Incidencias</h2>
            <p className="muted">
              Un espacio para documentar un problema relacionado con la contratación y escuchar a
              ambas partes.
            </p>
            {data.incidents.map((i) => (
              <IncidentView incident={i} user={user} key={i.id} />
            ))}
            {accepted || data.bookings.length ? (
              <details>
                <summary>Abrir una incidencia</summary>
                <ActionForm
                  action="incident.create"
                  data={(f) => ({ requestId: r.id, title: val(f, "title"), body: val(f, "body") })}
                  reset
                  submitLabel="Abrir incidencia"
                  success="Incidencia registrada. Ambas partes pueden responder y administración podrá revisarla."
                >
                  <Field label="Motivo">
                    <input name="title" required minLength={5} maxLength={140} />
                  </Field>
                  <Field label="Explica qué ha ocurrido">
                    <textarea name="body" required minLength={15} maxLength={5000} rows={4} />
                  </Field>
                </ActionForm>
              </details>
            ) : (
              <p className="small-text muted">
                Podrás abrir una incidencia vinculada a una contratación cuando exista un
                presupuesto aceptado o una reserva. Para consultas, utiliza los mensajes.
              </p>
            )}
          </section>
        </div>
        <aside className="stack request-aside">
          <div className="panel-card">
            <span className="eyebrow">EL SIGUIENTE PASO</span>
            <h2>
              {r.status === "new"
                ? "Ya está en camino."
                : r.status === "inspection"
                  ? "Primero, una visita."
                  : r.status === "quoted"
                    ? "Una propuesta sobre la mesa."
                    : r.status === "accepted"
                      ? "Busquemos una fecha."
                      : r.status === "booked"
                        ? "Tu cita tiene su hueco."
                        : r.status === "completed"
                          ? "Trabajo documentado."
                          : r.status === "cancelled"
                            ? "Solicitud cerrada."
                            : "Hablemos de la solución."}
            </h2>
            <p>
              {r.status === "new"
                ? "El profesional recibirá un aviso interno. Puedes completar la información por mensajes."
                : r.status === "inspection"
                  ? "El profesional necesita ver la instalación antes de valorar la reparación. Acordad el alcance y el precio de esa visita por escrito."
                  : r.status === "quoted"
                    ? "Revisa los conceptos y las notas antes de aceptar. Si algo no encaja, coméntalo por mensajes."
                    : r.status === "accepted"
                      ? "La propuesta está aceptada. El cliente puede elegir un servicio y un hueco para reservar."
                      : r.status === "booked"
                        ? "Consulta el estado de la reserva y conserva aquí cualquier cambio acordado."
                        : r.status === "completed"
                          ? "El expediente conserva mensajes, propuestas, citas y el resumen del trabajo."
                          : r.status === "cancelled"
                            ? "Se conserva toda la conversación y el historial."
                            : "Aclarad el problema antes de acordar el trabajo. No hay un diagnóstico automático."}
            </p>
            {isPro && !closed && !activeBooking && (
              <div className="stack">
                <ActionButton
                  action="request.status"
                  data={{ requestId: r.id, status: "inspection" }}
                  className="btn secondary full"
                >
                  Necesito inspección presencial
                </ActionButton>
                {r.status !== "discussion" && (
                  <ActionButton
                    action="request.status"
                    data={{ requestId: r.id, status: "discussion" }}
                    className="text-link"
                  >
                    Volver a conversación
                  </ActionButton>
                )}
                <small>
                  Estas acciones sustituyen las propuestas pendientes o aceptadas que aún no tienen
                  cita; será necesaria una nueva aceptación.
                </small>
              </div>
            )}
            <hr />
            <Link className="text-link" href={`/profesionales/${r.slug}`}>
              Ver perfil de {p.name}
            </Link>
            {!!p.is_demo && (
              <p className="demo-note">
                <span className="demo-tag">DEMO</span>Perfil ficticio.
              </p>
            )}
            <ul className="check-list">
              <li>
                <Check size={14} />
                Confirmación {p.auto_confirm ? "automática" : "manual"}
              </li>
              <li>
                <Check size={14} />
                Cancelar con {p.cancel_hours} h de antelación
              </li>
              <li>
                <Check size={14} />
                Sin movimientos de dinero
              </li>
            </ul>
          </div>
          <div className="panel-card">
            <h3>Registro del expediente</h3>
            <div className="timeline">
              {data.history.map((h) => (
                <div key={h.id}>
                  <span className="timeline-dot" />
                  <strong>{labels[h.to_status] || h.to_status}</strong>
                  <small>
                    {h.actor_name} · {dateTime(h.created_at)}
                  </small>
                  {h.note && <p>{h.note}</p>}
                </div>
              ))}
            </div>
          </div>
          {!closed && !activeBooking && (
            <details className="panel-card">
              <summary>Cerrar sin contratación</summary>
              <ActionForm
                action="request.cancel"
                data={(f) => ({ requestId: r.id, reason: val(f, "reason") })}
                submitLabel="Cerrar solicitud"
              >
                <Field label="Motivo">
                  <textarea name="reason" required minLength={5} maxLength={500} rows={3} />
                </Field>
              </ActionForm>
            </details>
          )}
        </aside>
      </div>
    </div>
  );
}
function MessageComposer({ requestId }: { requestId: string }) {
  const [body, setBody] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const router = useRouter();
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await apiAction("message.send", { requestId, body });
      setBody("");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo enviar.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="message-composer" onSubmit={submit}>
      <label className="sr-only" htmlFor="message-body">
        Tu mensaje
      </label>
      <textarea
        id="message-body"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        required
        maxLength={5000}
        rows={3}
        placeholder="Escribe aquí. Una pregunta también es un buen comienzo…"
      />
      <div>
        <small>Conversación privada entre cliente y profesional.</small>
        <button className="btn primary small" disabled={busy || !body.trim()}>
          {busy ? (
            "Enviando…"
          ) : (
            <>
              Enviar <Send size={16} />
            </>
          )}
        </button>
      </div>
      <Feedback error={error} />
    </form>
  );
}
function PhotoUpload({ requestId }: { requestId: string }) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [done, setDone] = useState("");
  const router = useRouter();
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget,
      fd = new FormData(form);
    fd.set("requestId", requestId);
    setBusy(true);
    setError("");
    setDone("");
    try {
      const r = await fetch("/api/attachments", { method: "POST", body: fd });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      form.reset();
      setDone("Fotografía añadida.");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo subir.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="photo-upload stack" onSubmit={submit}>
      <Field label="Añadir fotografía" hint="JPG, PNG o WebP · máximo 5 MB · sin metadatos">
        <input
          type="file"
          name="file"
          accept="image/jpeg,image/png,image/webp"
          required
          disabled={busy}
        />
      </Field>
      <Feedback error={error} success={done} />
      <Submit busy={busy} className="btn secondary small">
        Añadir al expediente
      </Submit>
    </form>
  );
}
function QuoteEditor({ requestId }: { requestId: string }) {
  const [lines, setLines] = useState([{ description: "", quantity: 1, amount: "" }]);
  return (
    <ActionForm
      action="quote.create"
      data={(f) => ({
        requestId,
        notes: val(f, "notes"),
        lines: lines.map((l) => ({
          description: l.description,
          quantity: l.quantity,
          unit_cents: Math.round(Number(l.amount.replace(",", ".")) * 100),
        })),
      })}
      submitLabel="Enviar presupuesto"
      success="Propuesta enviada. El cliente puede revisarla y aceptarla."
    >
      <div className="quote-lines-editor">
        {lines.map((line, i) => (
          <div key={i} className="quote-line">
            <Field label={`Concepto ${i + 1}`}>
              <input
                required
                minLength={2}
                maxLength={180}
                value={line.description}
                onChange={(e) =>
                  setLines(
                    lines.map((l, n) => (n === i ? { ...l, description: e.target.value } : l)),
                  )
                }
              />
            </Field>
            <Field label="Unidades">
              <input
                required
                type="number"
                min={1}
                max={100}
                value={line.quantity}
                onChange={(e) =>
                  setLines(
                    lines.map((l, n) => (n === i ? { ...l, quantity: Number(e.target.value) } : l)),
                  )
                }
              />
            </Field>
            <Field label="Precio total/ud. (€)">
              <input
                required
                type="number"
                min={0}
                max={100000}
                step="0.01"
                value={line.amount}
                onChange={(e) =>
                  setLines(lines.map((l, n) => (n === i ? { ...l, amount: e.target.value } : l)))
                }
              />
            </Field>
            <button
              type="button"
              className="icon-btn"
              aria-label={`Quitar concepto ${i + 1}`}
              disabled={lines.length === 1}
              onClick={() => setLines(lines.filter((_, n) => n !== i))}
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        className="text-link"
        disabled={lines.length >= 20}
        onClick={() => setLines([...lines, { description: "", quantity: 1, amount: "" }])}
      >
        <Plus size={15} />
        Añadir concepto
      </button>
      <Field label="Alcance, impuestos, gastos y condiciones">
        <textarea
          name="notes"
          maxLength={2000}
          rows={3}
          placeholder="Detalla qué incluye y qué queda pendiente. Los cambios requieren nueva propuesta y aceptación."
        />
      </Field>
      <p className="quote-total">
        <span>Total con impuestos y gastos incluidos</span>
        <strong>
          {money(
            lines.reduce(
              (sum, l) => sum + Math.round((Number(l.amount) || 0) * 100) * l.quantity,
              0,
            ),
          )}
        </strong>
      </p>
      <small>
        Una nueva versión sustituye las propuestas anteriores y requiere una nueva aceptación. No se
        puede cambiar el presupuesto de una cita activa.
      </small>
    </ActionForm>
  );
}
function BookingForm({ data }: { data: RequestDetail }) {
  const [slot, setSlot] = useState(0),
    [sid, setSid] = useState(data.services[0]?.id || "");
  return (
    <section className="panel-card" id="reservar">
      <span className="eyebrow">PROPUESTA ACEPTADA</span>
      <h2>Un hueco para la solución.</h2>
      {data.services.length ? (
        <ActionForm
          action="booking.create"
          data={() => ({ requestId: data.request.id, serviceId: sid, startsAt: slot })}
          submitLabel={
            data.professional.auto_confirm ? "Confirmar mi reserva" : "Solicitar esta reserva"
          }
          success="Reserva guardada. Consulta su estado en las citas de esta solicitud."
        >
          <SlotPicker
            professionalId={data.professional.id}
            services={data.services}
            selected={slot}
            serviceId={sid}
            onServiceChange={(s) => {
              setSid(s);
              setSlot(0);
            }}
            onSelect={(t, s) => {
              setSlot(t);
              setSid(s);
            }}
          />
          <p className="muted">
            {slot
              ? `Has elegido ${dateTime(slot)}.`
              : "Elige el servicio acordado y uno de sus huecos disponibles."}
          </p>
          <small>
            {data.professional.auto_confirm
              ? "La cita quedará confirmada automáticamente."
              : "El profesional debe confirmar la cita. Mientras tanto, el hueco queda bloqueado."}{" "}
            Puedes cancelar con {data.professional.cancel_hours} h de antelación. No se realiza
            ningún pago.
          </small>
        </ActionForm>
      ) : (
        <p>
          El profesional debe publicar un servicio y su disponibilidad para que puedas elegir una
          cita. Puedes escribirle por mensajes.
        </p>
      )}
    </section>
  );
}
