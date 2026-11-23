"use client";
import { useEffect, useState } from "react";
import { timeOnly } from "@/lib/format";
import type { Service } from "@/lib/types";
import { Field } from "./ui";
function today() {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
export function SlotPicker({
  professionalId,
  services,
  onSelect,
  selected,
  serviceId,
  onServiceChange,
}: {
  professionalId: string;
  services: Service[];
  onSelect?: (start: number, serviceId: string) => void;
  selected?: number;
  serviceId?: string;
  onServiceChange?: (id: string) => void;
}) {
  const [sid, setSid] = useState(serviceId || services[0]?.id || ""),
    [date, setDate] = useState(today()),
    [state, setState] = useState<{ slots: number[]; loading: boolean; error: string }>({
      slots: [],
      loading: true,
      error: "",
    });
  useEffect(() => {
    const controller = new AbortController();
    if (!sid) return;
    fetch(`/api/slots?professional=${professionalId}&service=${sid}&date=${date}`, {
      signal: controller.signal,
    })
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error);
        return d;
      })
      .then((d) => setState({ slots: d.slots, loading: false, error: "" }))
      .catch((e) => {
        if (e.name !== "AbortError") setState({ slots: [], loading: false, error: e.message });
      });
    return () => controller.abort();
  }, [professionalId, sid, date]);
  return (
    <div className="slot-picker">
      <Field label="Servicio">
        <select
          value={sid}
          onChange={(e) => {
            setSid(e.target.value);
            setState({ slots: [], loading: true, error: "" });
            onServiceChange?.(e.target.value);
            onSelect?.(0, e.target.value);
          }}
        >
          {services.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} · {s.duration} min
            </option>
          ))}
        </select>
      </Field>
      <Field label="Fecha · hora de Madrid">
        <input
          type="date"
          min={today()}
          value={date}
          required
          onChange={(e) => {
            if (e.target.value) {
              setDate(e.target.value);
              setState({ slots: [], loading: true, error: "" });
              onSelect?.(0, sid);
            }
          }}
        />
      </Field>
      {state.loading ? (
        <p role="status" className="muted">
          Consultando agenda…
        </p>
      ) : state.error ? (
        <p role="alert" className="text-error">
          {state.error}
        </p>
      ) : state.slots.length ? (
        <div className="slots" aria-label="Horarios disponibles">
          {state.slots.map((t) =>
            onSelect ? (
              <button
                type="button"
                className={selected === t ? "slot selected" : "slot"}
                key={t}
                onClick={() => onSelect(t, sid)}
              >
                {timeOnly(t)}
              </button>
            ) : (
              <span className="slot" key={t}>
                {timeOnly(t)}
              </span>
            ),
          )}
        </div>
      ) : (
        <p className="empty-inline">
          No hay huecos para este servicio en esta fecha. Prueba otro día.
        </p>
      )}
    </div>
  );
}
