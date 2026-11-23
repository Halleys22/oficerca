import Link from "next/link";
import { currentUser } from "@/lib/auth";
import { publicProfessionals } from "@/lib/queries";
import { RequestWizard } from "@/components/request-wizard";
export const metadata = { title: "Cuéntanos qué ocurre" };
export default async function NewRequest({
  searchParams,
}: {
  searchParams: Promise<{ profesional?: string; servicio?: string }>;
}) {
  const user = await currentUser(),
    q = await searchParams;
  const next = `/solicitar?${new URLSearchParams(q).toString()}`;
  if (!user)
    return (
      <div className="container section narrow">
        <span className="eyebrow">TU CONSULTA, EN PRIVADO</span>
        <h1>Primero, tu espacio.</h1>
        <p>
          Necesitas una cuenta para enviar tu consulta, conversar con el profesional y conservar los
          acuerdos.
        </p>
        <div className="button-row">
          <Link href={`/acceso?next=${encodeURIComponent(next)}`} className="btn primary">
            Ya tengo cuenta
          </Link>
          <Link
            href={`/acceso?modo=registro&next=${encodeURIComponent(next)}`}
            className="btn secondary"
          >
            Crear cuenta de cliente
          </Link>
        </div>
        <p className="muted">
          Puedes seguir <Link href="/profesionales">explorando perfiles sin registrarte</Link>.
        </p>
      </div>
    );
  if (user.role !== "client")
    return (
      <div className="container section narrow">
        <h1>Estás en tu cuenta {user.role === "pro" ? "profesional" : "administrativa"}.</h1>
        <p>
          Las solicitudes se envían desde una cuenta de cliente. Tu cuenta actual gestiona su propio
          espacio.
        </p>
        <Link href="/panel" className="btn primary">
          Ir a mi espacio
        </Link>
      </div>
    );
  return (
    <RequestWizard
      professionals={publicProfessionals()}
      professionalId={q.profesional}
      serviceId={q.servicio}
    />
  );
}
