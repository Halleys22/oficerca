import Link from "next/link";
export default function NotFound() {
  return (
    <div className="container section narrow">
      <span className="eyebrow">404</span>
      <h1>Por aquí no hay nada que arreglar.</h1>
      <p>La página no existe o el perfil ya no está disponible.</p>
      <Link className="btn primary" href="/profesionales">
        Buscar un profesional
      </Link>
    </div>
  );
}
