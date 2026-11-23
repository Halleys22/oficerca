"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ArrowRight, LockKeyhole, Wrench } from "lucide-react";
import { Feedback, Field, Submit } from "./ui";
export function AuthForm({
  register = false,
  role = "client",
  next = "/panel",
  demo = false,
}: {
  register?: boolean;
  role?: string;
  next?: string;
  demo?: boolean;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState("");
  const router = useRouter();
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    try {
      const r = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: register ? "register" : "login",
          email,
          password,
          name: fd.get("name"),
          role: fd.get("role"),
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      router.push(next.startsWith("/") && !next.startsWith("//") ? next : "/panel");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo iniciar sesión.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth-layout container">
      <div className="auth-story">
        <span className="eyebrow">UN POCO MÁS CERCA DE LA SOLUCIÓN</span>
        <h1>
          {register ? (
            <>
              Buenas manos.
              <br />
              <em>Buenas conexiones.</em>
            </>
          ) : (
            <>
              Tu casa y tu oficio,
              <br />
              <em>en su sitio.</em>
            </>
          )}
        </h1>
        <p>
          {register
            ? "Crea tu cuenta para conversar, acordar presupuestos y organizar citas sin perder el hilo."
            : "Tus conversaciones, tus próximos trabajos y esos pequeños asuntos que ya tienen solución."}
        </p>
        <div className="auth-illustration">
          <Wrench size={75} strokeWidth={1} />
          <span>
            Tu problema,
            <br />
            <strong>en buenas manos.</strong>
          </span>
        </div>
        <p className="small-text muted">Alpha local · Fontanería no urgente en Cáceres</p>
      </div>
      <div className="auth-card">
        <LockKeyhole size={24} />
        <h2>{register ? "Vamos a conocernos" : "Qué bien tenerte por aquí"}</h2>
        <p>{register ? "Solo lo necesario para empezar." : "Entra en tu espacio de OFICERCA."}</p>
        <form className="stack" onSubmit={submit}>
          <fieldset className="form-fields" disabled={busy}>
            {register && (
              <>
                <Field label="Tu nombre">
                  <input name="name" autoComplete="name" required minLength={2} maxLength={80} />
                </Field>
                <Field label="Quiero utilizar OFICERCA para">
                  <select name="role" defaultValue={role === "pro" ? "pro" : "client"}>
                    <option value="client">Encontrar ayuda para mi hogar</option>
                    <option value="pro">Organizar mi trabajo como profesional</option>
                  </select>
                </Field>
              </>
            )}
            <Field label="Correo electrónico">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                maxLength={254}
              />
            </Field>
            <Field
              label="Contraseña"
              hint={register ? "Al menos 10 caracteres; máximo 72 bytes." : undefined}
            >
              <input
                type="password"
                required
                minLength={register ? 10 : 1}
                maxLength={72}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={register ? "new-password" : "current-password"}
              />
            </Field>
            {register && (
              <label className="check-label">
                <input type="checkbox" required />
                He leído las <Link href="/condiciones">condiciones de la alpha</Link>.
              </label>
            )}
          </fieldset>
          <Feedback error={error} />
          <Submit busy={busy}>
            {register ? "Crear mi cuenta" : "Entrar en mi espacio"}
            <ArrowRight size={17} />
          </Submit>
        </form>
        <p className="auth-switch">
          {register ? "¿Ya tienes cuenta?" : "¿Es tu primera visita?"}{" "}
          <Link
            href={`/acceso?${register ? "" : "modo=registro&"}next=${encodeURIComponent(next)}`}
          >
            {register ? "Inicia sesión" : "Crea tu cuenta"}
          </Link>
        </p>
        {demo && !register && (
          <div className="demo-accounts">
            <span className="demo-tag">SOLO EN LOCAL</span>
            <p>Prueba cada lado de OFICERCA.</p>
            <div>
              {[
                ["Cliente", "cliente"],
                ["Profesional", "profesional"],
                ["Administración", "admin"],
              ].map(([label, key]) => (
                <button
                  type="button"
                  key={key}
                  className="btn secondary small"
                  onClick={() => {
                    setEmail(`${key}@oficerca.test`);
                    setPassword("OficercaDemo!2026");
                    setError("");
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
            <small>Los botones rellenan las credenciales demo. Pulsa «Entrar» para acceder.</small>
          </div>
        )}
      </div>
    </div>
  );
}
