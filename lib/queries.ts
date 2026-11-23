import { all, one } from "./db";
import { assert } from "./errors";
import type {
  Attachment,
  Booking,
  History,
  Incident,
  IncidentResponse,
  Message,
  Notice,
  OwnClient,
  Professional,
  Quote,
  QuoteLine,
  RequestDetail,
  Review,
  Schedule,
  Exception,
  Service,
  User,
  WorkRequest,
  Workspace,
} from "./types";

const requestSelect = `SELECT r.*,u.name AS client_name,p.name AS professional_name,p.slug,
  (SELECT m.sender_id FROM messages m JOIN conversations c ON c.id=m.conversation_id WHERE c.request_id=r.id ORDER BY m.created_at DESC,m.rowid DESC LIMIT 1) AS last_sender_id
  FROM requests r JOIN users u ON u.id=r.client_id JOIN professionals p ON p.id=r.professional_id`;
const bookingSelect = `SELECT b.*,COALESCE(u.name,c.name) AS client_name,p.name AS professional_name FROM bookings b JOIN professionals p ON p.id=b.professional_id LEFT JOIN users u ON u.id=b.client_id LEFT JOIN own_clients c ON c.id=b.own_client_id`;
export function servicesFor(proId: string) {
  return all<Service>(
    "SELECT * FROM services WHERE professional_id=? AND active=1 ORDER BY rowid",
    proId,
  );
}
export function publicProfessionals() {
  return all<Professional>(`SELECT p.*, (SELECT MIN(price_cents) FROM services WHERE professional_id=p.id AND active=1) AS min_price,
    (SELECT AVG(r.rating) FROM reviews r JOIN bookings b ON b.id=r.booking_id WHERE b.professional_id=p.id) AS rating,
    (SELECT COUNT(*) FROM reviews r JOIN bookings b ON b.id=r.booking_id WHERE b.professional_id=p.id) AS review_count FROM professionals p JOIN users u ON u.id=p.user_id WHERE u.disabled=0 ORDER BY p.rowid`).map(
    (p) => ({
      ...p,
      zones: all<{ name: string }>(
        "SELECT name FROM coverage_areas WHERE professional_id=?",
        p.id,
      ).map((z) => z.name),
      services: servicesFor(p.id),
    }),
  );
}
export function profile(slug: string) {
  const pro = publicProfessionals().find((p) => p.slug === slug);
  if (!pro) return null;
  return {
    professional: pro,
    services: servicesFor(pro.id),
    schedule: all<Schedule>(
      "SELECT * FROM availability WHERE professional_id=? ORDER BY weekday,start_minute",
      pro.id,
    ),
    portfolio: all<{ id: string; title: string; description: string; is_demo: number }>(
      "SELECT * FROM portfolio WHERE professional_id=?",
      pro.id,
    ),
    reviews: all<Review>(
      "SELECT r.id,r.rating,r.body,r.created_at,u.name AS author_name FROM reviews r JOIN bookings b ON b.id=r.booking_id JOIN users u ON u.id=r.author_id WHERE b.professional_id=? ORDER BY r.created_at DESC",
      pro.id,
    ),
  };
}
export function ownProfessional(user: User) {
  return user.role === "pro"
    ? one<Professional>("SELECT * FROM professionals WHERE user_id=?", user.id)
    : undefined;
}
export function accessibleRequest(user: User, requestId: string) {
  const request = one<WorkRequest>(`${requestSelect} WHERE r.id=?`, requestId);
  assert(request, "Solicitud no encontrada.", 404);
  const pro = one<Professional>("SELECT * FROM professionals WHERE id=?", request.professional_id)!;
  assert(
    user.id === request.client_id || user.id === pro.user_id,
    "No tienes acceso a esta solicitud.",
    403,
  );
  return { request, pro };
}
export function incidentsFor(requestId?: string) {
  const incidents = requestId
    ? all<Incident>(
        "SELECT * FROM incidents WHERE request_id=? ORDER BY created_at DESC",
        requestId,
      )
    : all<Incident>("SELECT * FROM incidents ORDER BY created_at DESC");
  return incidents.map((i) => ({
    ...i,
    responses: all<IncidentResponse>(
      "SELECT r.*,u.name AS author_name FROM incident_responses r JOIN users u ON u.id=r.author_id WHERE incident_id=? ORDER BY r.created_at,r.rowid",
      i.id,
    ),
  }));
}
export function requestDetail(user: User, requestId: string): RequestDetail {
  const { request, pro } = accessibleRequest(user, requestId);
  return {
    request,
    professional: pro,
    services: servicesFor(pro.id),
    messages: all<Message>(
      "SELECT m.*,u.name AS sender_name FROM messages m JOIN conversations c ON c.id=m.conversation_id JOIN users u ON u.id=m.sender_id WHERE c.request_id=? ORDER BY m.created_at,m.rowid",
      requestId,
    ),
    attachments: all<Attachment>(
      "SELECT id,request_id,message_id,name,size,created_at FROM attachments WHERE request_id=? ORDER BY created_at",
      requestId,
    ),
    quotes: all<Quote>(
      "SELECT * FROM quotes WHERE request_id=? ORDER BY version DESC",
      requestId,
    ).map((q) => ({
      ...q,
      lines: all<QuoteLine>("SELECT * FROM quote_lines WHERE quote_id=? ORDER BY rowid", q.id),
    })),
    bookings: all<Booking>(
      `${bookingSelect} WHERE b.request_id=? ORDER BY b.starts_at DESC`,
      requestId,
    ),
    history: all<History>(
      `SELECT h.*,u.name AS actor_name FROM status_history h JOIN users u ON u.id=h.actor_id WHERE (entity_type='request' AND entity_id=?) OR (entity_type='quote' AND entity_id IN (SELECT id FROM quotes WHERE request_id=?)) OR (entity_type='booking' AND entity_id IN (SELECT id FROM bookings WHERE request_id=?)) OR (entity_type='incident' AND entity_id IN (SELECT id FROM incidents WHERE request_id=?)) ORDER BY h.created_at DESC,h.rowid DESC`,
      requestId,
      requestId,
      requestId,
      requestId,
    ),
    incidents: incidentsFor(requestId),
    reviews: all<Review>(
      "SELECT r.*,u.name AS author_name FROM reviews r JOIN bookings b ON b.id=r.booking_id JOIN users u ON u.id=r.author_id WHERE b.request_id=?",
      requestId,
    ),
  };
}
export function workspace(user: User): Workspace {
  const pro = ownProfessional(user);
  const requests =
    user.role === "client"
      ? all<WorkRequest>(`${requestSelect} WHERE r.client_id=? ORDER BY r.updated_at DESC`, user.id)
      : pro
        ? all<WorkRequest>(
            `${requestSelect} WHERE r.professional_id=? ORDER BY r.updated_at DESC`,
            pro.id,
          )
        : [];
  return {
    user,
    professional: pro
      ? {
          ...pro,
          zones: all<{ name: string }>(
            "SELECT name FROM coverage_areas WHERE professional_id=?",
            pro.id,
          ).map((z) => z.name),
        }
      : null,
    requests,
    bookings:
      user.role === "client"
        ? all<Booking>(`${bookingSelect} WHERE b.client_id=? ORDER BY b.starts_at`, user.id)
        : pro
          ? all<Booking>(`${bookingSelect} WHERE b.professional_id=? ORDER BY b.starts_at`, pro.id)
          : [],
    notifications: all<Notice>(
      "SELECT * FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT 100",
      user.id,
    ),
    clients: pro
      ? all<OwnClient>("SELECT * FROM own_clients WHERE professional_id=? ORDER BY name", pro.id)
      : [],
    schedule: pro
      ? all<Schedule>(
          "SELECT * FROM availability WHERE professional_id=? ORDER BY weekday,start_minute",
          pro.id,
        )
      : [],
    exceptions: pro
      ? all<Exception>(
          "SELECT * FROM availability_exceptions WHERE professional_id=? ORDER BY starts_at",
          pro.id,
        )
      : [],
    services: pro ? servicesFor(pro.id) : [],
    incidents: user.role === "admin" ? incidentsFor() : [],
    portfolio: pro
      ? all("SELECT * FROM portfolio WHERE professional_id=? ORDER BY rowid DESC", pro.id)
      : [],
  };
}
