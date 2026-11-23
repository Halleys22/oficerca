import { Temporal } from "@js-temporal/polyfill";
export function localInputInstant(input: string) {
  try {
    const d = Temporal.PlainDateTime.from(input);
    return Temporal.ZonedDateTime.from(
      {
        timeZone: "Europe/Madrid",
        year: d.year,
        month: d.month,
        day: d.day,
        hour: d.hour,
        minute: d.minute,
      },
      { disambiguation: "reject" },
    ).epochMilliseconds;
  } catch {
    throw new Error(
      "Elige una fecha y hora válidas. Las horas ambiguas o inexistentes del cambio de horario no están disponibles.",
    );
  }
}
export function dayKey(ms = Date.now()) {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(ms);
}
export function nextDate(date: string, days: number) {
  return Temporal.PlainDate.from(date).add({ days }).toString();
}
