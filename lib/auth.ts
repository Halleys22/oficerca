import { cookies } from "next/headers";
import { getIronSession } from "iron-session";
import { redirect } from "next/navigation";
import { userById, demoAllowed } from "./accounts";
import { AppError } from "./errors";

interface Session {
  userId: string;
  version: number;
}
export async function session() {
  const password = process.env.SESSION_SECRET;
  if (!password || password.length < 32)
    throw new Error("Ejecuta npm run setup para generar SESSION_SECRET.");
  return getIronSession<Session>(await cookies(), {
    password,
    cookieName: "oficerca_session",
    ttl: 8 * 60 * 60,
    cookieOptions: {
      httpOnly: true,
      secure: process.env.SECURE_COOKIES !== "false",
      sameSite: "lax",
      path: "/",
    },
  });
}
export async function currentUser() {
  const s = await session();
  if (!s.userId) return null;
  const user = userById(s.userId);
  return user && user.session_version === s.version && (!user.is_demo || demoAllowed())
    ? user
    : null;
}
export async function requireUser() {
  const user = await currentUser();
  if (!user) throw new AppError(401, "Inicia sesión para continuar.");
  return user;
}
export async function pageUser() {
  const user = await currentUser();
  if (!user) redirect("/acceso");
  return user;
}
