"use client";
import Link from "next/link";
export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="container section narrow">
      <h1>Algo se ha quedado a medias.</h1>
      <p>
        No hemos podido cargar esta página. Puedes intentarlo de nuevo; los datos ya guardados se
        conservan.
      </p>
      <div className="button-row">
        <button className="btn primary" onClick={reset}>
          Volver a intentar
        </button>
        <Link className="btn secondary" href="/">
          Ir al inicio
        </Link>
      </div>
    </div>
  );
}
