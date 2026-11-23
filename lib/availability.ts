import { Temporal } from "@js-temporal/polyfill";
import { all, one } from "./db";
import { assert } from "./errors";
import type { Booking, Exception, Professional, Schedule, Service } from "./types";

export const ZONE = "Europe/Madrid";
export function madridDate(now = Date.now()) {
  return Temporal.Instant.fromEpochMilliseconds(now)
    .toZonedDateTimeISO(ZONE)
    .toPlainDate()
    .toString();
}
export function addDays(date: string, days: number) {
  return Temporal.PlainDate.from(date).add({ days }).toString();
}
export function wallInstant(date: string, minute: number): number {
  let day = Temporal.PlainDate.from(date);
  if (minute === 1440) {
    day = day.add({ days: 1 });
    minute = 0;
  }
  return Temporal.ZonedDateTime.from(
    {
      timeZone: ZONE,
      year: day.year,
      month: day.month,
      day: day.day,
      hour: Math.floor(minute / 60),
      minute: minute % 60,
    },
    { disambiguation: "reject" },
  ).epochMilliseconds;
}
export function localInputInstant(input: string) {
  assert(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(input), "Fecha y hora no válidas.");
  try {
    const d = Temporal.PlainDateTime.from(input);
    return Temporal.ZonedDateTime.from(
      { timeZone: ZONE, year: d.year, month: d.month, day: d.day, hour: d.hour, minute: d.minute },
      { disambiguation: "reject" },
    ).epochMilliseconds;
  } catch {
    throw new Error("Esta hora no existe o es ambigua por el cambio de horario. Elige otra hora.");
  }
}
export function slotsForDate(
  proId: string,
  serviceId: string,
  date: string,
  now = Date.now(),
): number[] {
  assert(/^\d{4}-\d{2}-\d{2}$/.test(date), "Fecha no válida.");
  let day: Temporal.PlainDate;
  try {
    day = Temporal.PlainDate.from(date);
  } catch {
    assert(false, "Fecha no válida.");
  }
  assert(
    Temporal.PlainDate.compare(day, madridDate(now)) >= 0 &&
      Temporal.PlainDate.compare(day, addDays(madridDate(now), 90)) <= 0,
    "Elige una fecha dentro de los próximos 90 días.",
  );
  const pro = one<Professional>("SELECT * FROM professionals WHERE id=?", proId);
  const service = one<Service>(
    "SELECT * FROM services WHERE id=? AND professional_id=? AND active=1",
    serviceId,
    proId,
  );
  assert(pro && service, "Servicio no disponible.", 404);
  const schedule = all<Schedule>(
    "SELECT * FROM availability WHERE professional_id=? AND weekday=? ORDER BY start_minute",
    proId,
    day.dayOfWeek,
  );
  const busy = all<Booking>(
    "SELECT * FROM bookings WHERE professional_id=? AND status IN ('pending','confirmed') AND busy_until>? AND starts_at<?",
    proId,
    wallInstant(date, 0),
    wallInstant(date, 1440),
  );
  const exceptions = all<Exception>(
    "SELECT * FROM availability_exceptions WHERE professional_id=? AND ends_at>? AND starts_at<?",
    proId,
    wallInstant(date, 0),
    wallInstant(date, 1440),
  );
  const result = new Set<number>();
  for (const shift of schedule) {
    for (let minute = shift.start_minute; minute < shift.end_minute; minute += 30) {
      let start: number, shiftEnd: number;
      try {
        start = wallInstant(date, minute);
        shiftEnd = wallInstant(date, shift.end_minute);
      } catch {
        continue;
      }
      const end = start + service.duration * 60_000,
        busyUntil = end + pro.gap * 60_000;
      if (start < now + pro.min_notice * 60_000 || end > shiftEnd) continue;
      if (busy.some((b) => b.starts_at < busyUntil && b.busy_until > start)) continue;
      if (exceptions.some((b) => b.starts_at < busyUntil && b.ends_at > start)) continue;
      result.add(start);
    }
  }
  return [...result].sort((a, b) => a - b);
}
