import { id, one, run } from "../lib/db";
import { performAction } from "../lib/actions";
import type { User } from "../lib/types";
export function fixture(hash = "not-used") {
  const now = Date.now();
  function makeUser(role: "client" | "pro" | "admin", name: string) {
    const uid = id();
    run(
      "INSERT INTO users(id,name,email,password_hash,role,created_at) VALUES (?,?,?,?,?,?)",
      uid,
      name,
      `${uid}@test.invalid`,
      hash,
      role,
      now,
    );
    return one<User>("SELECT * FROM users WHERE id=?", uid)!;
  }
  const client = makeUser("client", "Cliente de prueba"),
    client2 = makeUser("client", "Otro cliente"),
    proUser = makeUser("pro", "Profesional de prueba"),
    admin = makeUser("admin", "Admin"),
    stranger = makeUser("pro", "Otro profesional");
  const pid = id();
  run(
    "INSERT INTO professionals(id,user_id,slug,name,specialty,bio,min_notice,gap) VALUES (?,?,?,?,?,?,0,15)",
    pid,
    proUser.id,
    `pro-${pid}`,
    "Taller de prueba",
    "Grifería",
    "Experiencia en reparaciones domésticas.",
  );
  const sid = id();
  run(
    "INSERT INTO services VALUES (?,?,?,?,?,?,?,?,?,1)",
    sid,
    pid,
    "Visita de revisión",
    "Revisión de fontanería",
    3500,
    "fixed",
    60,
    "onsite",
    "",
  );
  for (let day = 1; day <= 7; day++)
    run("INSERT INTO availability VALUES (?,?,?,?,?)", id(), pid, day, 480, 1080);
  function request(actor = client) {
    return performAction(actor, "request.create", {
      professionalId: pid,
      title: "Goteo de un grifo",
      description: "El grifo de la cocina no deja de gotear desde hace dos días.",
      symptoms: ["Goteo o fuga"],
      mode: "onsite",
    }).id!;
  }
  function acceptedRequest(actor = client) {
    const rid = request(actor);
    const qid = performAction(proUser, "quote.create", {
      requestId: rid,
      notes: "Incluye impuestos y gastos.",
      lines: [{ description: "Visita de revisión", quantity: 1, unit_cents: 3500 }],
    }).id!;
    performAction(actor, "quote.decide", { quoteId: qid, decision: "accepted" });
    return { rid, qid };
  }
  return { client, client2, proUser, admin, stranger, pid, sid, request, acceptedRequest };
}
