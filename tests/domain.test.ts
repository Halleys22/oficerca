import { beforeAll, beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import bcrypt from "bcryptjs";
import { all, one, openDatabase, run } from "../lib/db";
import { performAction } from "../lib/actions";
import { authenticate, rateLimit, register, userById } from "../lib/accounts";
import { accessibleRequest, requestDetail, workspace } from "../lib/queries";
import {
  addDays,
  localInputInstant,
  madridDate,
  slotsForDate,
  wallInstant,
} from "../lib/availability";
import { fixture } from "./fixture";
import type { Booking, Professional, Quote } from "../lib/types";

const store = globalThis as unknown as { oficercaDb?: ReturnType<typeof openDatabase> };
let hash: string;
let f: ReturnType<typeof fixture>;
beforeAll(async () => {
  hash = await bcrypt.hash("Password!2026", 10);
});
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-20T06:00:00Z"));
  store.oficercaDb = openDatabase(":memory:");
  f = fixture(hash);
  process.env.DEMO_MODE = "true";
  process.env.APP_ORIGIN = "http://localhost:3000";
});
afterEach(() => {
  store.oficercaDb?.close();
  store.oficercaDb = undefined;
  vi.useRealTimers();
});
const start = () => wallInstant("2026-10-21", 600);
const book = () => {
  const { rid, qid } = f.acceptedRequest();
  const bid = performAction(f.client, "booking.create", {
    requestId: rid,
    serviceId: f.sid,
    startsAt: start(),
  }).id!;
  return { rid, qid, bid };
};

describe("identidad y permisos", () => {
  it("normaliza registros SQLite para serializarlos en React sin exponer hashes", () => {
    const user = userById(f.client.id)!;
    expect(Object.getPrototypeOf(user)).toBe(Object.prototype);
    expect(user).not.toHaveProperty("password_hash");
    expect(
      all("SELECT id FROM users").every((row) => Object.getPrototypeOf(row) === Object.prototype),
    ).toBe(true);
  });
  it("autentica con bcrypt y no devuelve el hash", async () => {
    const user = await authenticate({ email: f.client.email, password: "Password!2026" });
    expect(user.id).toBe(f.client.id);
    expect(user).not.toHaveProperty("password_hash");
  });
  it("rechaza contraseña incorrecta, cuenta deshabilitada y demo pública", async () => {
    await expect(authenticate({ email: f.client.email, password: "incorrecta" })).rejects.toThrow(
      "incorrectos",
    );
    run("UPDATE users SET disabled=1 WHERE id=?", f.client.id);
    await expect(
      authenticate({ email: f.client.email, password: "Password!2026" }),
    ).rejects.toThrow("incorrectos");
    run("UPDATE users SET disabled=0,is_demo=1 WHERE id=?", f.client.id);
    process.env.APP_ORIGIN = "https://example.com";
    await expect(
      authenticate({ email: f.client.email, password: "Password!2026" }),
    ).rejects.toThrow("incorrectos");
  });
  it("registra un profesional con perfil persistente y contraseña cifrada", async () => {
    const user = await register({
      name: "Nuevo profesional",
      email: "nuevo@example.test",
      password: "Contraseña!2026",
      role: "pro",
    });
    expect(userById(user.id)?.role).toBe("pro");
    expect(one<Professional>("SELECT * FROM professionals WHERE user_id=?", user.id)?.name).toBe(
      "Nuevo profesional",
    );
    expect(
      one<{ password_hash: string }>("SELECT password_hash FROM users WHERE id=?", user.id)
        ?.password_hash,
    ).not.toBe("Contraseña!2026");
  });
  it("no permite crear administradores mediante registro", async () => {
    await expect(
      register({
        name: "Intruso",
        email: "admin2@example.test",
        password: "Password!2026",
        role: "admin",
      }),
    ).rejects.toThrow();
  });
  it("limita intentos de abuso de forma persistente", () => {
    rateLimit("test", 2, 60000);
    rateLimit("test", 2, 60000);
    expect(() => rateLimit("test", 2, 60000)).toThrow("Demasiados");
    vi.advanceTimersByTime(60001);
    expect(() => rateLimit("test", 2, 60000)).not.toThrow();
  });
  it("restringe solicitudes y mensajes a ambos participantes, incluso frente a admin", () => {
    const rid = f.request();
    expect(accessibleRequest(f.client, rid).request.id).toBe(rid);
    expect(accessibleRequest(f.proUser, rid).request.id).toBe(rid);
    for (const user of [f.client2, f.stranger, f.admin]) {
      expect(() => requestDetail(user, rid)).toThrow("acceso");
      expect(() =>
        performAction(user, "message.send", { requestId: rid, body: "Mensaje privado" }),
      ).toThrow("acceso");
    }
    expect(workspace(f.stranger).requests).toHaveLength(0);
    expect(workspace(f.client2).requests).toHaveLength(0);
  });
  it("valida en servidor y exige rol cliente para solicitar", () => {
    expect(() =>
      performAction(f.client, "request.create", {
        professionalId: f.pid,
        title: "x",
        description: "x",
        mode: "onsite",
      }),
    ).toThrow();
    expect(() => performAction(f.proUser, "request.create", {})).toThrow("clientes");
    expect(() => performAction(f.client, "profile.save", {})).toThrow("profesional");
  });
  it("no expone notas de clientes propios a otros roles", () => {
    performAction(f.proUser, "client.save", { name: "Carmen", notes: "Nota privada" });
    expect(workspace(f.proUser).clients[0].notes).toBe("Nota privada");
    expect(workspace(f.admin).clients).toHaveLength(0);
    expect(workspace(f.client).clients).toHaveLength(0);
  });
});
describe("solicitudes, mensajes y presupuestos", () => {
  it("publica y edita trabajos del propio perfil y protege su titularidad", () => {
    const itemId = performAction(f.proUser, "portfolio.save", {
      title: "Revisión de cocina",
      description: "Sustitución de un grifo y comprobación de estanqueidad.",
    }).id!;
    performAction(f.proUser, "portfolio.save", {
      id: itemId,
      title: "Grifería revisada",
      description: "Se ha actualizado la descripción de este trabajo propio.",
    });
    expect(workspace(f.proUser).portfolio[0].title).toBe("Grifería revisada");
    expect(() => performAction(f.client, "portfolio.delete", { id: itemId })).toThrow(
      "profesional",
    );
    expect(() =>
      performAction(f.stranger, "portfolio.save", {
        id: itemId,
        title: "Intrusión",
        description: "Intento de editar un trabajo de otro profesional.",
      }),
    ).toThrow();
  });
  it("guarda mensajes cronológicos e identifica al remitente", () => {
    const rid = f.request();
    performAction(f.client, "message.send", { requestId: rid, body: "¿Puedo enviar una foto?" });
    vi.advanceTimersByTime(1000);
    performAction(f.proUser, "message.send", {
      requestId: rid,
      body: "Sí, será útil para preparar la visita.",
    });
    const d = requestDetail(f.client, rid);
    expect(d.messages.map((m) => m.sender_id)).toEqual([f.client.id, f.proUser.id]);
    expect(d.request.status).toBe("discussion");
    expect(workspace(f.proUser).notifications).toHaveLength(2);
  });
  it("versiona propuestas, conserva conceptos y exige nueva aceptación", () => {
    const { rid, qid } = f.acceptedRequest();
    const next = performAction(f.proUser, "quote.create", {
      requestId: rid,
      notes: "Cambio acordado",
      lines: [{ description: "Revisión", quantity: 2, unit_cents: 4000 }],
    }).id!;
    expect(one<Quote>("SELECT * FROM quotes WHERE id=?", qid)?.status).toBe("superseded");
    const detail = requestDetail(f.client, rid);
    expect(detail.quotes[0].total_cents).toBe(8000);
    expect(detail.quotes[1].lines[0].description).toBe("Visita de revisión");
    expect(() =>
      performAction(f.client, "quote.decide", { quoteId: qid, decision: "accepted" }),
    ).toThrow("pendiente");
    expect(() =>
      performAction(f.proUser, "quote.decide", { quoteId: next, decision: "accepted" }),
    ).toThrow("cliente");
    performAction(f.client, "quote.decide", { quoteId: next, decision: "accepted" });
    expect(() =>
      performAction(f.client, "quote.decide", { quoteId: next, decision: "accepted" }),
    ).toThrow("pendiente");
  });
  it("una inspección sustituye una oferta no reservada", () => {
    const { rid, qid } = f.acceptedRequest();
    performAction(f.proUser, "request.status", { requestId: rid, status: "inspection" });
    expect(requestDetail(f.client, rid).request.status).toBe("inspection");
    expect(one<Quote>("SELECT * FROM quotes WHERE id=?", qid)?.status).toBe("superseded");
  });
  it("no crea presupuestos ni aceptaciones en solicitudes cerradas", () => {
    const rid = f.request();
    performAction(f.client, "request.cancel", {
      requestId: rid,
      reason: "Ya no necesito la revisión",
    });
    expect(() =>
      performAction(f.proUser, "quote.create", {
        requestId: rid,
        lines: [{ description: "Revisión", quantity: 1, unit_cents: 1000 }],
      }),
    ).toThrow("cerrada");
    expect(requestDetail(f.client, rid).history.some((h) => h.to_status === "cancelled")).toBe(
      true,
    );
  });
});
describe("agenda y reservas", () => {
  it("calcula turnos, antelación mínima y duración", () => {
    const date = "2026-10-20";
    run("UPDATE professionals SET min_notice=120 WHERE id=?", f.pid);
    const slots = slotsForDate(f.pid, f.sid, date);
    expect(slots[0]).toBe(wallInstant(date, 600));
    expect(slots.at(-1)).toBe(wallInstant(date, 1020));
    run("DELETE FROM availability WHERE professional_id=? AND weekday=2", f.pid);
    expect(slotsForDate(f.pid, f.sid, date)).toHaveLength(0);
  });
  it("excluye excepciones, vacaciones y descansos entre trabajos", () => {
    const { bid } = book();
    expect(one<Booking>("SELECT * FROM bookings WHERE id=?", bid)?.status).toBe("pending");
    const slots = slotsForDate(f.pid, f.sid, "2026-10-21");
    expect(slots).not.toContain(start());
    expect(slots).not.toContain(start() + 60 * 60_000);
    expect(slots).not.toContain(start() - 60 * 60_000);
    expect(slots).toContain(start() + 90 * 60_000);
    performAction(f.proUser, "exception.create", {
      startsAt: wallInstant("2026-10-21", 840),
      endsAt: wallInstant("2026-10-21", 1080),
      reason: "Vacaciones",
    });
    expect(slotsForDate(f.pid, f.sid, "2026-10-21")).not.toContain(wallInstant("2026-10-21", 900));
  });
  it("impide reservar sin propuesta aceptada y rechaza horarios fuera del turno", () => {
    const rid = f.request();
    expect(() =>
      performAction(f.client, "booking.create", {
        requestId: rid,
        serviceId: f.sid,
        startsAt: start(),
      }),
    ).toThrow("Acepta");
    const accepted = f.acceptedRequest();
    expect(() =>
      performAction(f.client, "booking.create", {
        requestId: accepted.rid,
        serviceId: f.sid,
        startsAt: wallInstant("2026-10-21", 1260),
      }),
    ).toThrow("disponible");
  });
  it("evita reservas duplicadas y modificaciones de propuestas activas", () => {
    const { rid } = book();
    expect(() =>
      performAction(f.client, "booking.create", {
        requestId: rid,
        serviceId: f.sid,
        startsAt: start(),
      }),
    ).toThrow();
    expect(() =>
      performAction(f.proUser, "quote.create", {
        requestId: rid,
        lines: [{ description: "Cambio", quantity: 1, unit_cents: 1000 }],
      }),
    ).toThrow("reserva activa");
    expect(() =>
      performAction(f.proUser, "exception.create", {
        startsAt: start(),
        endsAt: start() + 3600000,
        reason: "Descanso",
      }),
    ).toThrow("coincide");
  });
  it("permite confirmación automática y confirmación manual exclusiva del profesional", () => {
    const { bid } = book();
    expect(() =>
      performAction(f.client, "booking.status", { bookingId: bid, status: "confirmed" }),
    ).toThrow("profesional");
    performAction(f.proUser, "booking.status", { bookingId: bid, status: "confirmed" });
    expect(one<Booking>("SELECT * FROM bookings WHERE id=?", bid)?.status).toBe("confirmed");
    run("UPDATE professionals SET auto_confirm=1 WHERE id=?", f.pid);
    const { rid } = f.acceptedRequest(f.client2);
    const bid2 = performAction(f.client2, "booking.create", {
      requestId: rid,
      serviceId: f.sid,
      startsAt: start() + 120 * 60_000,
    }).id!;
    expect(one<Booking>("SELECT * FROM bookings WHERE id=?", bid2)?.status).toBe("confirmed");
  });
  it("cancela, libera el hueco y conserva mensajes, propuestas e historial", () => {
    const { rid, bid } = book();
    performAction(f.proUser, "message.send", { requestId: rid, body: "Nos vemos en la visita." });
    const before = requestDetail(f.client, rid);
    performAction(f.proUser, "booking.status", {
      bookingId: bid,
      status: "cancelled",
      reason: "No puedo acudir ese día",
    });
    const after = requestDetail(f.client, rid);
    expect(after.messages).toHaveLength(before.messages.length);
    expect(after.quotes).toHaveLength(1);
    expect(after.history.some((h) => h.to_status === "cancelled")).toBe(true);
    expect(after.request.status).toBe("accepted");
    expect(slotsForDate(f.pid, f.sid, "2026-10-21")).toContain(start());
  });
  it("aplica el plazo de cancelación del cliente y permite gestionar al profesional", () => {
    const { bid } = book();
    vi.setSystemTime(start() - 2 * 3600000);
    expect(() =>
      performAction(f.client, "booking.status", {
        bookingId: bid,
        status: "cancelled",
        reason: "Cambio de planes",
      }),
    ).toThrow("plazo");
    expect(() =>
      performAction(f.proUser, "booking.status", {
        bookingId: bid,
        status: "cancelled",
        reason: "Cambio acordado por mensaje",
      }),
    ).not.toThrow();
  });
  it("acepta cancelación del cliente dentro del plazo", () => {
    const { bid } = book();
    run("UPDATE professionals SET cancel_hours=12 WHERE id=?", f.pid);
    performAction(f.client, "booking.status", {
      bookingId: bid,
      status: "cancelled",
      reason: "Cambio de planes",
    });
    expect(one<Booking>("SELECT * FROM bookings WHERE id=?", bid)?.status).toBe("cancelled");
  });
  it("guarda citas de cliente propio sin comisión y bloquea la agenda", () => {
    const cid = performAction(f.proUser, "client.save", {
      name: "Cliente habitual",
      notes: "Nota",
    }).id!;
    const bid = performAction(f.proUser, "booking.manual", {
      clientId: cid,
      serviceId: f.sid,
      startsAt: start(),
      notes: "Revisión anual",
    }).id!;
    const b = one<Booking>("SELECT * FROM bookings WHERE id=?", bid)!;
    expect(b.commission_bps).toBe(0);
    expect(b.source).toBe("own");
    expect(b.client_id).toBeNull();
    expect(slotsForDate(f.pid, f.sid, "2026-10-21")).not.toContain(start());
    expect(() =>
      performAction(f.stranger, "client.save", { id: cid, name: "Robo de ficha" }),
    ).toThrow("profesional");
  });
  it("finaliza tras la hora de fin, conserva resumen y admite reseña ligada al trabajo", () => {
    const { rid, bid } = book();
    performAction(f.proUser, "booking.status", { bookingId: bid, status: "confirmed" });
    expect(() =>
      performAction(f.proUser, "booking.status", {
        bookingId: bid,
        status: "completed",
        reason: "Sustituido el cartucho",
      }),
    ).toThrow("horario");
    vi.setSystemTime(start() + 61 * 60000);
    performAction(f.proUser, "booking.status", {
      bookingId: bid,
      status: "completed",
      reason: "Sustituido el cartucho y comprobado el cierre",
    });
    expect(requestDetail(f.client, rid).request.status).toBe("completed");
    expect(
      one<{ summary: string }>("SELECT summary FROM completed_jobs WHERE booking_id=?", bid)
        ?.summary,
    ).toContain("cartucho");
    performAction(f.client, "review.create", {
      bookingId: bid,
      rating: 5,
      body: "La visita ha ido muy bien.",
    });
    expect(() =>
      performAction(f.client, "review.create", {
        bookingId: bid,
        rating: 4,
        body: "Otra valoración duplicada",
      }),
    ).toThrow("Ya has");
    performAction(f.proUser, "booking.collection", { bookingId: bid, status: "recorded" });
    expect(one<Booking>("SELECT * FROM bookings WHERE id=?", bid)?.collection_status).toBe(
      "recorded",
    );
  });
  it("la restricción SQLite impide solapar incluso actualizando directamente", () => {
    const { bid } = book();
    performAction(f.proUser, "booking.status", {
      bookingId: bid,
      status: "cancelled",
      reason: "Motivo de prueba",
    });
    book();
    expect(() => run("UPDATE bookings SET status='confirmed' WHERE id=?", bid)).toThrow(
      "BOOKING_OVERLAP",
    );
  });
});
describe("incidencias y administración", () => {
  it("permite explicación, réplica, revisión y cierre con historial", () => {
    const { rid } = book();
    const iid = performAction(f.client, "incident.create", {
      requestId: rid,
      title: "Duda sobre el alcance",
      body: "Quiero aclarar si el presupuesto contempla la pieza nueva.",
    }).id!;
    performAction(f.proUser, "incident.reply", {
      incidentId: iid,
      body: "La pieza se valorará después de la inspección.",
    });
    expect(() =>
      performAction(f.client2, "incident.reply", { incidentId: iid, body: "No soy participante" }),
    ).toThrow("acceso");
    expect(() =>
      performAction(f.client, "incident.status", {
        incidentId: iid,
        status: "reviewing",
        note: "Intento de administrar",
      }),
    ).toThrow("administración");
    performAction(f.admin, "incident.status", {
      incidentId: iid,
      status: "reviewing",
      note: "Se solicita aclaración escrita a ambas partes.",
    });
    performAction(f.admin, "incident.status", {
      incidentId: iid,
      status: "closed",
      note: "Las partes han documentado el alcance de la visita.",
    });
    const inc = workspace(f.admin).incidents[0];
    expect(inc.status).toBe("closed");
    expect(inc.responses).toHaveLength(4);
    expect(
      requestDetail(f.client, rid).history.filter((h) => h.entity_type === "incident"),
    ).toHaveLength(3);
    expect(() =>
      performAction(f.proUser, "incident.reply", {
        incidentId: iid,
        body: "Respuesta tras el cierre",
      }),
    ).toThrow("cerrada");
  });
  it("no crea incidentes sin contratación", () => {
    const rid = f.request();
    expect(() =>
      performAction(f.client, "incident.create", {
        requestId: rid,
        title: "Todavía no contraté",
        body: "Este expediente solo contiene una consulta inicial.",
      }),
    ).toThrow("contratación");
  });
});
describe("Europe/Madrid y horario de verano", () => {
  it("conserva las 09:00 locales al cambiar la compensación UTC", () => {
    expect(new Date(wallInstant("2026-03-28", 540)).toISOString()).toBe("2026-03-28T08:00:00.000Z");
    expect(new Date(wallInstant("2026-03-29", 540)).toISOString()).toBe("2026-03-29T07:00:00.000Z");
    expect(new Date(wallInstant("2026-10-25", 540)).toISOString()).toBe("2026-10-25T08:00:00.000Z");
  });
  it("rechaza horas inexistentes o ambiguas en entradas manuales", () => {
    expect(() => localInputInstant("2026-03-29T02:30")).toThrow("horario");
    expect(() => localInputInstant("2026-10-25T02:30")).toThrow("horario");
  });
  it("calcula huecos únicos durante el cambio y descarta las horas ambiguas", () => {
    vi.setSystemTime(new Date("2026-10-24T00:00:00Z"));
    run(
      "UPDATE availability SET start_minute=60,end_minute=300 WHERE professional_id=? AND weekday=7",
      f.pid,
    );
    const slots = slotsForDate(f.pid, f.sid, "2026-10-25");
    expect(slots.length).toBeGreaterThan(0);
    expect(new Set(slots).size).toBe(slots.length);
    expect(
      slots.every(
        (t) =>
          new Intl.DateTimeFormat("en-GB", { hour: "2-digit", timeZone: "Europe/Madrid" }).format(
            t,
          ) !== "02",
      ),
    ).toBe(true);
  });
  it("limita el horizonte a 90 días y rechaza fechas inválidas", () => {
    expect(() => slotsForDate(f.pid, f.sid, addDays(madridDate(), 91))).toThrow("90 días");
    expect(() => slotsForDate(f.pid, f.sid, "2026-02-31")).toThrow("válida");
  });
});
