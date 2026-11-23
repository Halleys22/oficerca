import bcrypt from "bcryptjs";
import { createHash } from "node:crypto";
import { z } from "./validation";
import { all, id, one, run, transaction } from "./db";
import { AppError, assert } from "./errors";
import type { User } from "./types";

export const passwordSchema = z
  .string()
  .min(10, "Usa al menos 10 caracteres.")
  .refine((v) => Buffer.byteLength(v, "utf8") <= 72, "La contraseña es demasiado larga.");
export function rateLimit(key: string, maximum: number, windowMs: number) {
  const hashed = createHash("sha256").update(key).digest("hex");
  transaction(() => {
    const now = Date.now();
    run("DELETE FROM rate_limits WHERE reset_at < ?", now);
    const current = one<{ count: number }>("SELECT count FROM rate_limits WHERE key=?", hashed);
    assert(
      !current || current.count < maximum,
      "Demasiados intentos. Espera unos minutos y vuelve a intentarlo.",
      429,
    );
    run(
      "INSERT INTO rate_limits(key,count,reset_at) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1",
      hashed,
      now + windowMs,
    );
  });
}
export function demoAllowed() {
  const origin = process.env.APP_ORIGIN || "http://localhost:3000";
  try {
    return (
      process.env.DEMO_MODE === "true" &&
      ["localhost", "127.0.0.1", "[::1]"].includes(new URL(origin).hostname)
    );
  } catch {
    return false;
  }
}
export async function authenticate(input: unknown) {
  const data = z
    .object({
      email: z
        .email()
        .max(254)
        .transform((s) => s.trim().toLowerCase()),
      password: z.string().min(1).max(200),
    })
    .parse(input);
  rateLimit(`login:${data.email}`, 10, 15 * 60_000);
  rateLimit("login:global", 150, 15 * 60_000);
  const user = one<User & { password_hash: string }>(
    "SELECT * FROM users WHERE email=?",
    data.email,
  );
  // A fixed, valid bcrypt hash makes missing accounts take the same expensive path.
  const valid = await bcrypt.compare(
    data.password,
    user?.password_hash || "$2b$12$8bi8nC2k0Lm.6SNak1ZGxO6YpaYM0g7xhBVzTqT0/5e7RoGH5S5.O",
  );
  assert(
    user && valid && !user.disabled && (!user.is_demo || demoAllowed()),
    "Correo o contraseña incorrectos.",
    401,
  );
  const { password_hash: _hash, ...safe } = user;
  void _hash;
  return safe;
}
export async function register(input: unknown) {
  const data = z
    .object({
      name: z.string().trim().min(2).max(80),
      email: z
        .email()
        .max(254)
        .transform((s) => s.trim().toLowerCase()),
      password: passwordSchema,
      role: z.enum(["client", "pro"]),
    })
    .parse(input);
  rateLimit("register:global", 20, 60 * 60_000);
  const hash = await bcrypt.hash(data.password, 12);
  return transaction(() => {
    assert(
      !one("SELECT id FROM users WHERE email=?", data.email),
      "No se puede crear una cuenta con este correo.",
      409,
    );
    const uid = id();
    run(
      "INSERT INTO users(id,name,email,password_hash,role,created_at) VALUES (?,?,?,?,?,?)",
      uid,
      data.name,
      data.email,
      hash,
      data.role,
      Date.now(),
    );
    if (data.role === "pro") {
      const pid = id();
      const slug =
        data.name
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "") || "profesional";
      run(
        "INSERT INTO professionals(id,user_id,slug,name,specialty,bio) VALUES (?,?,?,?,?,?)",
        pid,
        uid,
        `${slug}-${pid.slice(0, 6)}`,
        data.name,
        "Fontanería doméstica",
        "Describe tu experiencia y los trabajos en los que puedes ayudar.",
      );
      run("INSERT INTO coverage_areas VALUES (?,?,?)", id(), pid, "Cáceres");
    }
    return one<User>(
      "SELECT id,name,email,role,is_demo,session_version,disabled FROM users WHERE id=?",
      uid,
    )!;
  });
}
export function userById(uid: string) {
  return one<User>(
    "SELECT id,name,email,role,is_demo,session_version,disabled FROM users WHERE id=? AND disabled=0",
    uid,
  );
}
export const countUsers = () =>
  all<{ count: number }>("SELECT COUNT(*) AS count FROM users")[0].count;
export function normalizeError(error: unknown): AppError {
  if (error instanceof AppError) return error;
  if (error instanceof z.ZodError)
    return new AppError(400, error.issues[0]?.message || "Revisa los datos del formulario.");
  if (error instanceof Error && error.message.includes("BOOKING_OVERLAP"))
    return new AppError(409, "Este hueco acaba de ocuparse. Elige otro horario.");
  return new AppError(500, "No se ha podido completar la operación. Inténtalo de nuevo.");
}
