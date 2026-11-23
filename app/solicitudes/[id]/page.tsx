import Link from "next/link";
import { notFound } from "next/navigation";
import { pageUser } from "@/lib/auth";
import { requestDetail } from "@/lib/queries";
import { RequestRoom } from "@/components/request-room";
import { AppError } from "@/lib/errors";
export const metadata = { title: "Expediente de trabajo" };
export default async function RequestPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await pageUser();
  let data;
  try {
    data = requestDetail(user, (await params).id);
  } catch (e) {
    if (e instanceof AppError && e.status === 404) notFound();
    if (e instanceof AppError && e.status === 403)
      return (
        <div className="container section narrow">
          <h1>Esta conversación es privada.</h1>
          <p>Solo el cliente y el profesional de la solicitud pueden acceder a su expediente.</p>
          <Link href="/panel" className="btn primary">
            Volver a mi espacio
          </Link>
        </div>
      );
    throw e;
  }
  return <RequestRoom data={data} user={user} />;
}
