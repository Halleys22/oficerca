import { z } from "./validation";
import { all, id, one, run, transaction } from "./db";
import { assert } from "./errors";
import { accessibleRequest, ownProfessional } from "./queries";
import { madridDate, slotsForDate } from "./availability";
import type { Booking, Professional, Quote, Service, User } from "./types";

const uid = z.string().uuid();
const text = (min = 1, max = 2000) => z.string().trim().min(min).max(max);
const cents = z.number().int().min(0).max(10_000_000);
const terminal = ["cancelled", "completed"];
export function history(
  user: User,
  entity: string,
  entityId: string,
  from: string | null,
  to: string,
  note = "",
) {
  run(
    "INSERT INTO status_history VALUES (?,?,?,?,?,?,?,?)",
    id(),
    entity,
    entityId,
    user.id,
    from,
    to,
    note,
    Date.now(),
  );
}
export function notify(userId: string, requestId: string | null, body: string) {
  run(
    "INSERT INTO notifications(id,user_id,request_id,body,created_at) VALUES (?,?,?,?,?)",
    id(),
    userId,
    requestId,
    body,
    Date.now(),
  );
}
function updateRequest(user: User, requestId: string, status: string, note = "") {
  const r = one<{ status: string }>("SELECT status FROM requests WHERE id=?", requestId)!;
  run("UPDATE requests SET status=?,updated_at=? WHERE id=?", status, Date.now(), requestId);
  if (r.status !== status || note) history(user, "request", requestId, r.status, status, note);
}
function professionalFor(user: User): Professional {
  const pro = ownProfessional(user);
  assert(pro, "Esta acción requiere una cuenta profesional.", 403);
  return pro;
}
function activeBooking(requestId: string) {
  return one<Booking>(
    "SELECT * FROM bookings WHERE request_id=? AND status IN ('pending','confirmed')",
    requestId,
  );
}

export function performAction(
  user: User,
  action: string,
  input: unknown,
): { id?: string; message?: string } {
  assert(!user.disabled, "Cuenta deshabilitada.", 403);
  return transaction(() => {
    switch (action) {
      case "request.create": {
        assert(user.role === "client", "Solo los clientes pueden enviar solicitudes.", 403);
        const d = z
          .object({
            professionalId: uid,
            title: text(4, 120),
            description: text(15, 5000),
            symptoms: z.array(text(1, 80)).max(8).default([]),
            mode: z.enum(["onsite", "remote"]),
          })
          .parse(input);
        const pro = one<Professional>(
          "SELECT p.* FROM professionals p JOIN users u ON p.user_id=u.id WHERE p.id=? AND u.disabled=0",
          d.professionalId,
        );
        assert(pro, "Profesional no encontrado.", 404);
        assert(d.mode !== "remote" || pro.remote, "Este profesional no ofrece consultas remotas.");
        const rid = id(),
          now = Date.now();
        run(
          "INSERT INTO requests VALUES (?,?,?,?,?,?,?,?,?,?)",
          rid,
          user.id,
          pro.id,
          d.title,
          d.description,
          JSON.stringify(d.symptoms),
          d.mode,
          "new",
          now,
          now,
        );
        run("INSERT INTO conversations VALUES (?,?)", id(), rid);
        history(user, "request", rid, null, "new", "Solicitud enviada");
        notify(pro.user_id, rid, `Nueva solicitud: ${d.title}`);
        return { id: rid };
      }
      case "message.send": {
        const d = z.object({ requestId: uid, body: text(1, 5000) }).parse(input);
        const { request, pro } = accessibleRequest(user, d.requestId);
        const conversation = one<{ id: string }>(
          "SELECT id FROM conversations WHERE request_id=?",
          request.id,
        )!;
        const mid = id();
        run(
          "INSERT INTO messages VALUES (?,?,?,?,?)",
          mid,
          conversation.id,
          user.id,
          d.body,
          Date.now(),
        );
        if (request.status === "new") updateRequest(user, request.id, "discussion");
        else run("UPDATE requests SET updated_at=? WHERE id=?", Date.now(), request.id);
        notify(
          user.id === request.client_id ? pro.user_id : request.client_id,
          request.id,
          `${user.name} te ha enviado un mensaje`,
        );
        return { id: mid };
      }
      case "request.status": {
        const d = z
          .object({ requestId: uid, status: z.enum(["discussion", "inspection"]) })
          .parse(input);
        const { request, pro } = accessibleRequest(user, d.requestId);
        assert(user.id === pro.user_id, "Solo el profesional puede indicar el diagnóstico.", 403);
        assert(
          !terminal.includes(request.status) && !activeBooking(request.id),
          "La solicitud no admite este cambio.",
          409,
        );
        // An inspection supersedes unbooked offers; a new quote is needed after the visit.
        for (const q of all<Quote>(
          "SELECT * FROM quotes WHERE request_id=? AND status IN ('sent','accepted')",
          request.id,
        )) {
          run("UPDATE quotes SET status='superseded' WHERE id=?", q.id);
          history(
            user,
            "quote",
            q.id,
            q.status,
            "superseded",
            "Se revisará tras la conversación o inspección",
          );
        }
        updateRequest(user, request.id, d.status);
        notify(
          request.client_id,
          request.id,
          d.status === "inspection"
            ? "El profesional necesita una inspección presencial antes de presupuestar."
            : "El profesional ha reabierto la conversación.",
        );
        return {};
      }
      case "request.cancel": {
        const d = z.object({ requestId: uid, reason: text(5, 500) }).parse(input);
        const { request, pro } = accessibleRequest(user, d.requestId);
        assert(
          !terminal.includes(request.status) && !activeBooking(request.id),
          "Cancela primero la reserva activa, si existe.",
          409,
        );
        for (const q of all<Quote>(
          "SELECT * FROM quotes WHERE request_id=? AND status IN ('sent','accepted')",
          request.id,
        )) {
          run("UPDATE quotes SET status='superseded' WHERE id=?", q.id);
          history(user, "quote", q.id, q.status, "superseded", d.reason);
        }
        updateRequest(user, request.id, "cancelled", d.reason);
        notify(
          user.id === request.client_id ? pro.user_id : request.client_id,
          request.id,
          "La solicitud se ha cerrado sin contratación.",
        );
        return {};
      }
      case "quote.create": {
        const d = z
          .object({
            requestId: uid,
            notes: text(0, 2000).default(""),
            lines: z
              .array(
                z.object({
                  description: text(2, 180),
                  quantity: z.number().int().min(1).max(100),
                  unit_cents: cents,
                }),
              )
              .min(1)
              .max(20),
          })
          .parse(input);
        const { request, pro } = accessibleRequest(user, d.requestId);
        assert(user.id === pro.user_id, "Solo el profesional puede presupuestar.", 403);
        assert(
          !terminal.includes(request.status) && !activeBooking(request.id),
          "No se puede modificar la propuesta con una reserva activa o una solicitud cerrada.",
          409,
        );
        const total = d.lines.reduce((sum, l) => sum + l.quantity * l.unit_cents, 0);
        assert(total <= 10_000_000, "El presupuesto supera el límite de la alpha.");
        const version =
          (one<{ v: number }>("SELECT MAX(version) AS v FROM quotes WHERE request_id=?", request.id)
            ?.v || 0) + 1;
        for (const q of all<Quote>(
          "SELECT * FROM quotes WHERE request_id=? AND status IN ('sent','accepted')",
          request.id,
        )) {
          run("UPDATE quotes SET status='superseded' WHERE id=?", q.id);
          history(user, "quote", q.id, q.status, "superseded", "Nueva versión del presupuesto");
        }
        const qid = id();
        run(
          "INSERT INTO quotes VALUES (?,?,?,?,?,?,?)",
          qid,
          request.id,
          version,
          "sent",
          d.notes,
          total,
          Date.now(),
        );
        for (const l of d.lines)
          run(
            "INSERT INTO quote_lines VALUES (?,?,?,?,?)",
            id(),
            qid,
            l.description,
            l.quantity,
            l.unit_cents,
          );
        history(
          user,
          "quote",
          qid,
          null,
          "sent",
          `Versión ${version}. Total con impuestos y gastos incluidos según declaración del profesional.`,
        );
        updateRequest(user, request.id, "quoted");
        notify(request.client_id, request.id, "Tienes un presupuesto para revisar.");
        return { id: qid };
      }
      case "quote.decide": {
        const d = z
          .object({ quoteId: uid, decision: z.enum(["accepted", "rejected"]) })
          .parse(input);
        const q = one<Quote>("SELECT * FROM quotes WHERE id=?", d.quoteId);
        assert(q, "Presupuesto no encontrado.", 404);
        const { request, pro } = accessibleRequest(user, q.request_id);
        assert(user.id === request.client_id, "Solo el cliente puede aceptar o rechazar.", 403);
        assert(
          q.status === "sent" && request.status === "quoted",
          "El presupuesto ya no está pendiente.",
          409,
        );
        run("UPDATE quotes SET status=? WHERE id=?", d.decision, q.id);
        history(user, "quote", q.id, "sent", d.decision);
        updateRequest(user, request.id, d.decision === "accepted" ? "accepted" : "discussion");
        notify(
          pro.user_id,
          request.id,
          d.decision === "accepted"
            ? "El cliente ha aceptado el presupuesto."
            : "El cliente ha rechazado el presupuesto.",
        );
        return {};
      }
      case "booking.create": {
        const d = z
          .object({ requestId: uid, serviceId: uid, startsAt: z.number().int().positive() })
          .parse(input);
        const { request, pro } = accessibleRequest(user, d.requestId);
        assert(user.id === request.client_id, "La reserva debe solicitarla el cliente.", 403);
        assert(
          request.status === "accepted" && !activeBooking(request.id),
          "Acepta un presupuesto antes de elegir la cita.",
          409,
        );
        const quote = one<Quote>(
          "SELECT * FROM quotes WHERE request_id=? AND status='accepted' ORDER BY version DESC LIMIT 1",
          request.id,
        );
        assert(quote, "Falta el presupuesto aceptado.", 409);
        const service = one<Service>(
          "SELECT * FROM services WHERE id=? AND professional_id=? AND active=1",
          d.serviceId,
          pro.id,
        );
        assert(service, "Servicio no disponible.", 404);
        assert(
          slotsForDate(pro.id, service.id, madridDate(d.startsAt)).includes(d.startsAt),
          "El horario ya no está disponible. Actualiza los huecos.",
          409,
        );
        const bid = id(),
          status = pro.auto_confirm ? "confirmed" : "pending",
          end = d.startsAt + service.duration * 60_000;
        run(
          "INSERT INTO bookings(id,professional_id,client_id,request_id,service_id,starts_at,ends_at,busy_until,status,source,commission_bps,title,amount_cents,created_at) VALUES (?,?,?,?,?,?,?,?,?,'marketplace',800,?,?,?)",
          bid,
          pro.id,
          user.id,
          request.id,
          service.id,
          d.startsAt,
          end,
          end + pro.gap * 60_000,
          status,
          service.name,
          quote.total_cents,
          Date.now(),
        );
        history(user, "booking", bid, null, status);
        updateRequest(user, request.id, "booked");
        notify(
          pro.user_id,
          request.id,
          pro.auto_confirm
            ? "Nueva cita confirmada automáticamente."
            : "Tienes una reserva pendiente de confirmar.",
        );
        notify(
          user.id,
          request.id,
          pro.auto_confirm
            ? "Tu cita está confirmada."
            : "Tu cita está pendiente de confirmación. El hueco queda reservado.",
        );
        return { id: bid };
      }
      case "booking.manual": {
        const pro = professionalFor(user);
        const d = z
          .object({
            clientId: uid,
            serviceId: uid,
            startsAt: z.number().int().positive(),
            notes: text(0, 2000).default(""),
          })
          .parse(input);
        assert(
          one("SELECT id FROM own_clients WHERE id=? AND professional_id=?", d.clientId, pro.id),
          "Cliente no encontrado.",
          404,
        );
        const service = one<Service>(
          "SELECT * FROM services WHERE id=? AND professional_id=? AND active=1",
          d.serviceId,
          pro.id,
        );
        assert(service, "Servicio no encontrado.", 404);
        assert(
          slotsForDate(pro.id, service.id, madridDate(d.startsAt)).includes(d.startsAt),
          "El horario ya no está disponible.",
          409,
        );
        const bid = id(),
          end = d.startsAt + service.duration * 60_000;
        run(
          "INSERT INTO bookings(id,professional_id,own_client_id,service_id,starts_at,ends_at,busy_until,status,source,commission_bps,title,notes,created_at) VALUES (?,?,?,?,?,?,?,'confirmed','own',0,?,?,?)",
          bid,
          pro.id,
          d.clientId,
          service.id,
          d.startsAt,
          end,
          end + pro.gap * 60_000,
          service.name,
          d.notes,
          Date.now(),
        );
        history(user, "booking", bid, null, "confirmed", "Cita manual · sin comisión de captación");
        notify(user.id, null, "Cita de cliente propio añadida a la agenda.");
        return { id: bid };
      }
      case "booking.status": {
        const d = z
          .object({
            bookingId: uid,
            status: z.enum(["confirmed", "cancelled", "completed"]),
            reason: text(0, 1000).default(""),
          })
          .parse(input);
        const b = one<Booking>("SELECT * FROM bookings WHERE id=?", d.bookingId);
        assert(b, "Reserva no encontrada.", 404);
        const pro = one<Professional>("SELECT * FROM professionals WHERE id=?", b.professional_id)!;
        const isPro = user.id === pro.user_id;
        assert(isPro || user.id === b.client_id, "No tienes acceso a esta reserva.", 403);
        assert(!terminal.includes(b.status), "La reserva ya está cerrada.", 409);
        if (d.status === "confirmed") {
          assert(isPro, "Solo el profesional puede confirmar.", 403);
          assert(
            b.status === "pending" && b.starts_at > Date.now(),
            "La cita no puede confirmarse.",
            409,
          );
        }
        if (d.status === "completed") {
          assert(isPro, "Solo el profesional puede finalizar.", 403);
          assert(
            b.status === "confirmed" && b.ends_at <= Date.now(),
            "Solo puedes finalizar una cita confirmada cuando haya terminado su horario.",
            409,
          );
          assert(d.reason.length >= 5, "Describe el trabajo realizado.");
        }
        if (d.status === "cancelled") {
          assert(d.reason.length >= 5, "Explica brevemente el motivo de la cancelación.");
          assert(
            isPro || b.starts_at - Date.now() >= pro.cancel_hours * 3_600_000,
            "El plazo de cancelación ha terminado. Contacta con el profesional o abre una incidencia.",
            409,
          );
        }
        run(
          "UPDATE bookings SET status=?,cancellation_reason=? WHERE id=?",
          d.status,
          d.status === "cancelled" ? d.reason : null,
          b.id,
        );
        history(user, "booking", b.id, b.status, d.status, d.reason);
        if (d.status === "completed")
          run("INSERT INTO completed_jobs VALUES (?,?,?,?)", id(), b.id, d.reason, Date.now());
        if (b.request_id) {
          updateRequest(
            user,
            b.request_id,
            d.status === "completed"
              ? "completed"
              : d.status === "cancelled"
                ? "accepted"
                : "booked",
            d.reason,
          );
          for (const recipient of [pro.user_id, b.client_id].filter(Boolean))
            notify(
              recipient!,
              b.request_id,
              d.status === "cancelled"
                ? "Cita cancelada. El horario vuelve a estar libre; se conserva el expediente."
                : d.status === "completed"
                  ? "Trabajo finalizado. Puedes consultar su historial."
                  : "Cita confirmada por el profesional.",
            );
        } else
          notify(
            user.id,
            null,
            d.status === "cancelled"
              ? "Cita cancelada y hueco liberado."
              : "Estado de la cita actualizado.",
          );
        return {};
      }
      case "booking.collection": {
        const pro = professionalFor(user);
        const d = z
          .object({ bookingId: uid, status: z.enum(["unrecorded", "pending", "recorded"]) })
          .parse(input);
        const b = one<Booking>(
          "SELECT * FROM bookings WHERE id=? AND professional_id=?",
          d.bookingId,
          pro.id,
        );
        assert(b, "Reserva no encontrada.", 404);
        assert(b.status === "completed", "Anota el cobro después de finalizar el trabajo.", 409);
        run("UPDATE bookings SET collection_status=? WHERE id=?", d.status, b.id);
        history(
          user,
          "booking",
          b.id,
          b.collection_status,
          d.status,
          "Anotación administrativa; OFICERCA no ha procesado ningún pago.",
        );
        return {};
      }
      case "profile.save": {
        const pro = professionalFor(user);
        const d = z
          .object({
            name: text(2, 100),
            specialty: text(3, 140),
            bio: text(15, 3000),
            experience: z.number().int().min(0).max(70),
            remote: z.boolean(),
            zones: z.array(text(2, 80)).min(1).max(12),
          })
          .parse(input);
        assert(
          d.remote ||
            !one(
              "SELECT id FROM services WHERE professional_id=? AND mode='remote' AND active=1",
              pro.id,
            ),
          "Retira primero tus servicios remotos antes de desactivar esta modalidad.",
        );
        run(
          "UPDATE professionals SET name=?,specialty=?,bio=?,experience=?,remote=? WHERE id=?",
          d.name,
          d.specialty,
          d.bio,
          d.experience,
          Number(d.remote),
          pro.id,
        );
        run("DELETE FROM coverage_areas WHERE professional_id=?", pro.id);
        for (const name of [...new Set(d.zones)])
          run("INSERT INTO coverage_areas VALUES (?,?,?)", id(), pro.id, name);
        return {};
      }
      case "service.save": {
        const pro = professionalFor(user);
        const d = z
          .object({
            id: uid.optional(),
            name: text(3, 120),
            description: text(0, 1500),
            price_cents: cents.nullable(),
            price_type: z.enum(["from", "fixed", "diagnosis"]),
            duration: z.number().int().min(15).max(480),
            mode: z.enum(["onsite", "remote"]),
            requirements: text(0, 1000).default(""),
          })
          .parse(input);
        assert(
          d.mode !== "remote" || pro.remote,
          "Activa las consultas remotas en tu perfil antes de ofrecerlas.",
        );
        assert(
          d.price_type === "diagnosis" || d.price_cents !== null,
          "Indica el precio orientativo o cerrado.",
        );
        if (d.id)
          assert(
            one("SELECT id FROM services WHERE id=? AND professional_id=?", d.id, pro.id),
            "Servicio no encontrado.",
            404,
          );
        const sid = d.id || id();
        run(
          "INSERT INTO services VALUES (?,?,?,?,?,?,?,?,?,1) ON CONFLICT(id) DO UPDATE SET name=excluded.name,description=excluded.description,price_cents=excluded.price_cents,price_type=excluded.price_type,duration=excluded.duration,mode=excluded.mode,requirements=excluded.requirements",
          sid,
          pro.id,
          d.name,
          d.description,
          d.price_type === "diagnosis" ? null : d.price_cents,
          d.price_type,
          d.duration,
          d.mode,
          d.requirements,
        );
        return { id: sid };
      }
      case "service.archive": {
        const pro = professionalFor(user);
        const d = z.object({ id: uid }).parse(input);
        const result = run(
          "UPDATE services SET active=0 WHERE id=? AND professional_id=?",
          d.id,
          pro.id,
        );
        assert(result.changes, "Servicio no encontrado.", 404);
        return {};
      }
      case "portfolio.save": {
        const pro = professionalFor(user);
        const d = z
          .object({ id: uid.optional(), title: text(3, 140), description: text(15, 2000) })
          .parse(input);
        if (d.id)
          assert(
            one("SELECT id FROM portfolio WHERE id=? AND professional_id=?", d.id, pro.id),
            "Trabajo no encontrado.",
            404,
          );
        const itemId = d.id || id();
        run(
          "INSERT INTO portfolio VALUES (?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET title=excluded.title,description=excluded.description",
          itemId,
          pro.id,
          d.title,
          d.description,
          pro.is_demo,
        );
        return { id: itemId };
      }
      case "portfolio.delete": {
        const pro = professionalFor(user);
        const d = z.object({ id: uid }).parse(input);
        assert(
          run("DELETE FROM portfolio WHERE id=? AND professional_id=?", d.id, pro.id).changes,
          "Trabajo no encontrado.",
          404,
        );
        return {};
      }
      case "schedule.save": {
        const pro = professionalFor(user);
        const d = z
          .object({
            min_notice: z.number().int().min(0).max(10080),
            gap: z.number().int().min(0).max(120),
            cancel_hours: z.number().int().min(0).max(168),
            auto_confirm: z.boolean(),
            shifts: z
              .array(
                z.object({
                  weekday: z.number().int().min(1).max(7),
                  start_minute: z.number().int().min(0).max(1439),
                  end_minute: z.number().int().min(1).max(1440),
                }),
              )
              .max(28),
          })
          .parse(input);
        for (const [index, s] of d.shifts.entries()) {
          assert(s.end_minute > s.start_minute, "La hora final debe ser posterior a la inicial.");
          assert(
            !d.shifts
              .slice(index + 1)
              .some(
                (t) =>
                  t.weekday === s.weekday &&
                  s.start_minute < t.end_minute &&
                  t.start_minute < s.end_minute,
              ),
            "Hay turnos semanales solapados.",
          );
        }
        run(
          "UPDATE professionals SET min_notice=?,gap=?,cancel_hours=?,auto_confirm=? WHERE id=?",
          d.min_notice,
          d.gap,
          d.cancel_hours,
          Number(d.auto_confirm),
          pro.id,
        );
        run("DELETE FROM availability WHERE professional_id=?", pro.id);
        for (const s of d.shifts)
          run(
            "INSERT INTO availability VALUES (?,?,?,?,?)",
            id(),
            pro.id,
            s.weekday,
            s.start_minute,
            s.end_minute,
          );
        notify(
          user.id,
          null,
          "Disponibilidad actualizada. Las citas existentes conservan su horario y su descanso reservado.",
        );
        return {};
      }
      case "exception.create": {
        const pro = professionalFor(user);
        const d = z
          .object({
            startsAt: z.number().int().positive(),
            endsAt: z.number().int().positive(),
            reason: text(3, 160),
          })
          .parse(input);
        assert(d.endsAt > d.startsAt, "La fecha final debe ser posterior a la inicial.");
        assert(
          !one(
            "SELECT id FROM bookings WHERE professional_id=? AND status IN ('pending','confirmed') AND starts_at<? AND busy_until>?",
            pro.id,
            d.endsAt,
            d.startsAt,
          ),
          "El bloqueo coincide con una cita. Gestiona esa reserva antes de bloquear el horario.",
          409,
        );
        const eid = id();
        run(
          "INSERT INTO availability_exceptions VALUES (?,?,?,?,?)",
          eid,
          pro.id,
          d.startsAt,
          d.endsAt,
          d.reason,
        );
        return { id: eid };
      }
      case "exception.delete": {
        const pro = professionalFor(user);
        const d = z.object({ id: uid }).parse(input);
        assert(
          run("DELETE FROM availability_exceptions WHERE id=? AND professional_id=?", d.id, pro.id)
            .changes,
          "Bloqueo no encontrado.",
          404,
        );
        return {};
      }
      case "client.save": {
        const pro = professionalFor(user);
        const d = z
          .object({
            id: uid.optional(),
            name: text(2, 100),
            email: z.union([z.email().max(254), z.literal("")]).default(""),
            phone: text(0, 30).default(""),
            notes: text(0, 3000).default(""),
          })
          .parse(input);
        if (d.id)
          assert(
            one("SELECT id FROM own_clients WHERE id=? AND professional_id=?", d.id, pro.id),
            "Cliente no encontrado.",
            404,
          );
        const cid = d.id || id();
        run(
          "INSERT INTO own_clients VALUES (?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,email=excluded.email,phone=excluded.phone,notes=excluded.notes",
          cid,
          pro.id,
          d.name,
          d.email,
          d.phone,
          d.notes,
          Date.now(),
        );
        return { id: cid };
      }
      case "incident.create": {
        const d = z
          .object({ requestId: uid, title: text(5, 140), body: text(15, 5000) })
          .parse(input);
        const { request, pro } = accessibleRequest(user, d.requestId);
        assert(
          one("SELECT id FROM quotes WHERE request_id=? AND status='accepted'", request.id) ||
            one("SELECT id FROM bookings WHERE request_id=?", request.id),
          "Las incidencias deben estar vinculadas a una contratación. Para consultas, utiliza los mensajes.",
        );
        const iid = id();
        run(
          "INSERT INTO incidents VALUES (?,?,?,?,?,?)",
          iid,
          request.id,
          user.id,
          d.title,
          "open",
          Date.now(),
        );
        run(
          "INSERT INTO incident_responses VALUES (?,?,?,?,?)",
          id(),
          iid,
          user.id,
          d.body,
          Date.now(),
        );
        history(user, "incident", iid, null, "open", d.title);
        notify(
          user.id === request.client_id ? pro.user_id : request.client_id,
          request.id,
          "Se ha abierto una incidencia sobre esta contratación.",
        );
        for (const admin of all<{ id: string }>(
          "SELECT id FROM users WHERE role='admin' AND disabled=0",
        ))
          notify(admin.id, request.id, "Nueva incidencia pendiente de revisión.");
        return { id: iid };
      }
      case "incident.reply": {
        const d = z.object({ incidentId: uid, body: text(5, 5000) }).parse(input);
        const inc = one<{ id: string; request_id: string; status: string }>(
          "SELECT * FROM incidents WHERE id=?",
          d.incidentId,
        );
        assert(inc, "Incidencia no encontrada.", 404);
        assert(inc.status !== "closed", "La incidencia está cerrada.", 409);
        if (user.role !== "admin") accessibleRequest(user, inc.request_id);
        run(
          "INSERT INTO incident_responses VALUES (?,?,?,?,?)",
          id(),
          inc.id,
          user.id,
          d.body,
          Date.now(),
        );
        const r = one<{ client_id: string; user_id: string }>(
          "SELECT r.client_id,p.user_id FROM requests r JOIN professionals p ON p.id=r.professional_id WHERE r.id=?",
          inc.request_id,
        )!;
        for (const recipient of [r.client_id, r.user_id])
          if (recipient !== user.id)
            notify(recipient, inc.request_id, "Hay una nueva respuesta en la incidencia.");
        return {};
      }
      case "incident.status": {
        assert(user.role === "admin", "Se requieren permisos de administración.", 403);
        const d = z
          .object({ incidentId: uid, status: z.enum(["reviewing", "closed"]), note: text(5, 2000) })
          .parse(input);
        const inc = one<{ id: string; status: string; request_id: string }>(
          "SELECT * FROM incidents WHERE id=?",
          d.incidentId,
        );
        assert(inc, "Incidencia no encontrada.", 404);
        assert(
          inc.status !== "closed" && inc.status !== d.status,
          "La incidencia ya tiene ese estado o está cerrada.",
          409,
        );
        run("UPDATE incidents SET status=? WHERE id=?", d.status, inc.id);
        run(
          "INSERT INTO incident_responses VALUES (?,?,?,?,?)",
          id(),
          inc.id,
          user.id,
          d.note,
          Date.now(),
        );
        history(user, "incident", inc.id, inc.status, d.status, d.note);
        const r = one<{ client_id: string; user_id: string }>(
          "SELECT r.client_id,p.user_id FROM requests r JOIN professionals p ON p.id=r.professional_id WHERE r.id=?",
          inc.request_id,
        )!;
        for (const recipient of [r.client_id, r.user_id])
          notify(
            recipient,
            inc.request_id,
            `Incidencia ${d.status === "closed" ? "cerrada" : "en revisión"}. Consulta la respuesta administrativa.`,
          );
        return {};
      }
      case "review.create": {
        const d = z
          .object({ bookingId: uid, rating: z.number().int().min(1).max(5), body: text(10, 1200) })
          .parse(input);
        const b = one<Booking>("SELECT * FROM bookings WHERE id=?", d.bookingId);
        assert(b, "Reserva no encontrada.", 404);
        assert(
          b.client_id === user.id && b.status === "completed",
          "Solo el cliente de un trabajo finalizado puede dejar una reseña.",
          403,
        );
        assert(
          !one("SELECT id FROM reviews WHERE booking_id=?", b.id),
          "Ya has valorado este trabajo.",
          409,
        );
        const rid = id();
        run(
          "INSERT INTO reviews VALUES (?,?,?,?,?,?)",
          rid,
          b.id,
          user.id,
          d.rating,
          d.body,
          Date.now(),
        );
        return { id: rid };
      }
      case "notifications.read":
        run(
          "UPDATE notifications SET read_at=? WHERE user_id=? AND read_at IS NULL",
          Date.now(),
          user.id,
        );
        return {};
      default:
        assert(false, "Acción no reconocida.", 404);
    }
  });
}
