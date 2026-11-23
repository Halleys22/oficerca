export const money = (cents: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(cents / 100);
export const dateTime = (ms: number) =>
  new Intl.DateTimeFormat("es-ES", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Madrid",
  }).format(ms);
export const timeOnly = (ms: number) =>
  new Intl.DateTimeFormat("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Madrid",
  }).format(ms);
export const dateOnly = (ms: number) =>
  new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "long",
    timeZone: "Europe/Madrid",
  }).format(ms);
export const initials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0])
    .join("");
export const labels: Record<string, string> = {
  new: "Nueva solicitud",
  discussion: "En conversación",
  inspection: "Necesita visita",
  quoted: "Presupuesto enviado",
  accepted: "Propuesta aceptada",
  booked: "Con cita",
  completed: "Finalizado",
  cancelled: "Cancelado",
  pending: "Por confirmar",
  confirmed: "Confirmado",
  sent: "Enviado",
  rejected: "Rechazado",
  superseded: "Sustituido",
  open: "Abierta",
  reviewing: "En revisión",
  closed: "Cerrada",
  onsite: "Presencial",
  remote: "Consulta remota",
  marketplace: "OFICERCA",
  own: "Cliente propio",
  unrecorded: "Sin registrar",
  recorded: "Cobro anotado",
};
