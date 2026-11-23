"use client";
import type { Incident, User } from "@/lib/types";
import { dateTime } from "@/lib/format";
import { ActionForm, Field, Status, val } from "./ui";
import { CircleHelp } from "lucide-react";
export function IncidentView({ incident: i, user }: { incident: Incident; user: User }) {
  return (
    <article className="panel-card incident-card">
      <div className="section-heading compact">
        <h3>
          <CircleHelp size={18} />
          {i.title}
        </h3>
        <Status value={i.status} />
      </div>
      <p className="muted small-text">
        Expediente {i.id.slice(0, 8).toUpperCase()} · solicitud{" "}
        {i.request_id.slice(0, 8).toUpperCase()} · {dateTime(i.created_at)}
      </p>
      <div className="incident-responses">
        {i.responses.map((r) => (
          <div key={r.id}>
            <strong>{r.author_name}</strong>
            <small>{dateTime(r.created_at)}</small>
            <p className="preserve">{r.body}</p>
          </div>
        ))}
      </div>
      {i.status !== "closed" && (
        <>
          <ActionForm
            action="incident.reply"
            data={(f) => ({ incidentId: i.id, body: val(f, "body") })}
            reset
            submitLabel="Añadir respuesta"
            success="Respuesta incorporada al expediente."
          >
            <Field label="Tu respuesta">
              <textarea name="body" required minLength={5} maxLength={5000} rows={3} />
            </Field>
          </ActionForm>
          {user.role === "admin" && (
            <details>
              <summary>Revisar estado administrativo</summary>
              <ActionForm
                action="incident.status"
                data={(f) => ({ incidentId: i.id, status: val(f, "status"), note: val(f, "note") })}
                submitLabel="Guardar revisión"
              >
                <Field label="Estado">
                  <select
                    name="status"
                    defaultValue={i.status === "reviewing" ? "closed" : "reviewing"}
                  >
                    {i.status !== "reviewing" && <option value="reviewing">En revisión</option>}
                    <option value="closed">Cerrar expediente</option>
                  </select>
                </Field>
                <Field label="Explicación visible a las partes">
                  <textarea name="note" required minLength={5} maxLength={2000} rows={3} />
                </Field>
                <small>Este registro no decide obligaciones legales ni procesa pagos.</small>
              </ActionForm>
            </details>
          )}
        </>
      )}
    </article>
  );
}
