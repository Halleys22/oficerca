import Link from "next/link";
import { Logo } from "./header";
export function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-main">
        <div>
          <Logo />
          <p>Tu problema, en buenas manos.</p>
          <span className="eyebrow">HECHO PARA HACERTE EL DÍA MÁS FÁCIL</span>
        </div>
        <div>
          <Link href="/profesionales">Encontrar un profesional</Link>
          <Link href="/para-profesionales">Herramientas para tu oficio</Link>
          <Link href="/condiciones">Condiciones y privacidad de la alpha</Link>
        </div>
        <div>
          <p>
            Empezamos cerca.
            <br />
            <strong>Cáceres, Extremadura.</strong>
          </p>
          <p className="muted">Fontanería doméstica no urgente.</p>
        </div>
      </div>
      <div className="container footer-bottom">
        <span>OFICERCA © {new Date().getFullYear()} · Alpha local</span>
        <span>Sin pagos reales. Perfiles demo identificados.</span>
      </div>
    </footer>
  );
}
