import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  ChevronDown,
  Droplets,
  MapPin,
  MessageCircle,
  Search,
  ShieldCheck,
  Sparkles,
  Wrench,
} from "lucide-react";
import { publicProfessionals } from "@/lib/queries";
import { ProfessionalCard } from "@/components/professionals";

function HomeIllustration() {
  return (
    <div className="hero-art" aria-label="Ilustración de un hogar cuidado">
      <svg viewBox="0 0 600 580" role="img" aria-label="Un baño luminoso con grifo y plantas">
        <defs>
          <pattern id="tiles" width="62" height="62" patternUnits="userSpaceOnUse">
            <rect width="62" height="62" fill="#e9ede5" />
            <path d="M62 0H0V62" fill="none" stroke="#cbd5c6" strokeWidth="1" />
          </pattern>
          <linearGradient id="mirror" x1="0" y1="0" x2="1" y2="1">
            <stop stopColor="#d4e4dc" />
            <stop offset="1" stopColor="#f6faf4" />
          </linearGradient>
        </defs>
        <path d="M94 518V233C94 113 178 38 300 38S506 113 506 233V518Z" fill="url(#tiles)" />
        <path
          d="M178 294V186a95 95 0 0 1 190 0v108Z"
          fill="url(#mirror)"
          stroke="#647b64"
          strokeWidth="9"
        />
        <path d="m195 259 118-130M211 280l125-140" stroke="white" strokeWidth="11" opacity=".5" />
        <rect x="141" y="350" width="287" height="153" rx="6" fill="#b9a382" />
        <path d="M285 355v148M151 431h267" stroke="#978665" strokeWidth="2" />
        <path d="M267 375v36M302 375v36" stroke="#465c46" strokeWidth="4" strokeLinecap="round" />
        <path d="M128 335h312l-13 34H141Z" fill="#f8f7ef" />
        <ellipse cx="281" cy="337" rx="81" ry="18" fill="#d6ddcf" />
        <path
          d="M277 322v-39c0-31 42-30 42-1v10"
          fill="none"
          stroke="#657d6b"
          strokeWidth="12"
          strokeLinecap="round"
        />
        <path d="M318 298v21" stroke="#86bdb4" strokeWidth="3" strokeDasharray="4 5" />
        <path
          d="M455 459c-23-46-20-82 1-132M455 417c-47-13-59-40-46-64 28 9 40 31 46 64M456 389c30-11 48-32 36-54-28 10-37 28-36 54M459 354c-24-23-23-48-9-62 22 16 21 40 9 62"
          fill="#527959"
        />
        <path d="M430 443h52l-8 60h-37Z" fill="#e1b294" />
        <rect x="120" y="499" width="358" height="10" rx="5" fill="#d0d7c8" />
        <path d="M166 505v18M407 505v18" stroke="#8d826a" strokeWidth="9" />
        <circle cx="412" cy="143" r="22" fill="#edc09c" />
        <path d="M412 125v36m-18-18h36" stroke="#fff6e7" strokeWidth="2" />
      </svg>
      <div className="art-note art-note-top">
        <span className="note-icon">
          <Wrench size={18} />
        </span>
        <div>
          <strong>¿Un grifo que gotea?</strong>
          <small>Hay alguien cerca que sabe ayudar.</small>
        </div>
      </div>
      <div className="art-note art-note-bottom">
        <span className="live-dot" />
        <span>
          Primero lo hablamos.
          <br />
          <strong>Después, lo arreglamos.</strong>
        </span>
        <MessageCircle size={23} />
      </div>
      <span className="art-label">MENOS VUELTAS. MÁS SOLUCIONES.</span>
    </div>
  );
}
export default function Home() {
  const pros = publicProfessionals().slice(0, 3);
  return (
    <>
      <section className="hero container">
        <div className="hero-copy">
          <span className="eyebrow">
            <span className="live-dot" /> TU BARRIO. TU CASA. TU TRANQUILIDAD.
          </span>
          <h1>
            No tienes que
            <br />
            saber qué pasa.
            <br />
            <em>Solo a quién llamar.</em>
          </h1>
          <p>
            Ese goteo, ese ruido, ese «esto antes no hacía eso». Cuéntanos qué ocurre y encuentra un
            profesional que te ayude a resolverlo.
          </p>
          <form className="hero-search" action="/profesionales">
            <div>
              <Search size={21} />
              <input aria-label="Qué necesitas" name="q" placeholder="¿Qué necesitas arreglar?" />
            </div>
            <span className="search-location">
              <MapPin size={17} /> Cáceres
            </span>
            <button className="btn primary" type="submit" aria-label="Buscar profesionales">
              <ArrowRight size={21} />
            </button>
          </form>
          <Link className="diagnosis-link" href="/solicitar">
            <Sparkles size={16} /> No sé qué le pasa <ArrowUpRight size={15} />
          </Link>
          <div className="hero-trust">
            <span>
              <Check size={15} /> Sin compromiso
            </span>
            <span>
              <Check size={15} /> Presupuesto antes de reservar
            </span>
          </div>
        </div>
        <HomeIllustration />
      </section>
      <div className="promise-strip">
        <div className="container">
          <span>
            <MessageCircle size={19} /> Habla con quien hará el trabajo
          </span>
          <span>
            <CalendarDays size={19} /> Encuentra un hueco que encaje
          </span>
          <span>
            <ShieldCheck size={19} /> Todo por escrito, en un mismo lugar
          </span>
        </div>
      </div>
      <section className="section container" id="como-funciona">
        <div className="section-heading">
          <div>
            <span className="eyebrow">DE «¿Y AHORA QUÉ?» A «YA ESTÁ»</span>
            <h2>
              Tu casa no viene con manual.
              <br />
              Nosotros te lo ponemos fácil.
            </h2>
          </div>
          <p>
            Sin saber de tuberías.
            <br />
            Sin explicar lo mismo tres veces.
          </p>
        </div>
        <div className="steps">
          <article>
            <span className="step-number">01 /</span>
            <div className="step-icon">
              <MessageCircle />
            </div>
            <h3>Cuéntanos qué ocurre</h3>
            <p>
              Descríbelo con tus palabras y añade una foto. No necesitas conocer el nombre de la
              pieza.
            </p>
          </article>
          <article>
            <span className="step-number">02 /</span>
            <div className="step-icon">
              <Wrench />
            </div>
            <h3>Encuentra tus buenas manos</h3>
            <p>
              Compara especialidades y tarifas. Habla con el profesional y recibe una propuesta
              clara.
            </p>
          </article>
          <article>
            <span className="step-number">03 /</span>
            <div className="step-icon">
              <CalendarDays />
            </div>
            <h3>Ponle fecha a la solución</h3>
            <p>
              Acepta el presupuesto, reserva un hueco y conserva mensajes, citas y acuerdos juntos.
            </p>
          </article>
        </div>
      </section>
      <section className="section section-tint">
        <div className="container">
          <div className="section-heading">
            <div>
              <span className="eyebrow">EMPEZAMOS POR LO CERCANO</span>
              <h2>Fontanería para el día a día.</h2>
              <p>Descubre cómo se ven los perfiles en nuestra alpha.</p>
            </div>
            <Link href="/profesionales" className="text-link">
              Explorar profesionales <ArrowRight size={18} />
            </Link>
          </div>
          <p className="demo-note">
            <span className="demo-tag">DEMO</span> Estos perfiles son ficticios. No representan a
            profesionales activos.
          </p>
          <div className="professional-grid">
            {pros.map((p, i) => (
              <ProfessionalCard key={p.id} professional={p} index={i} />
            ))}
          </div>
        </div>
      </section>
      <section className="section container">
        <div className="pro-banner">
          <div>
            <span className="eyebrow">PARA QUIEN SABE HACERLO</span>
            <h2>
              Tu oficio es tu trabajo.
              <br />
              Gestionarlo no debería
              <br />
              <em>quitarte el día.</em>
            </h2>
            <p>
              Tus clientes de siempre, tu agenda y tus presupuestos. Un espacio para trabajar con
              más orden, lleguen de donde lleguen tus clientes.
            </p>
            <Link className="btn cream" href="/para-profesionales">
              Descubre tu espacio profesional <ArrowUpRight size={18} />
            </Link>
          </div>
          <div className="agenda-preview">
            <div className="agenda-top">
              <span>Tu día, bajo control</span>
              <CalendarDays size={19} />
            </div>
            <div className="agenda-date">UNA AGENDA QUE TRABAJA CONTIGO</div>
            <div className="agenda-entry">
              <span>09:00</span>
              <div>
                <strong>Revisión de grifería</strong>
                <small>Tu cliente habitual</small>
                <span className="status status-confirmed">Confirmada</span>
              </div>
            </div>
            <div className="agenda-gap">
              <span>11:00</span>
              <span>Un hueco para lo que venga</span>
            </div>
            <div className="agenda-entry pale">
              <span>12:00</span>
              <div>
                <strong>Visita de diagnóstico</strong>
                <small>Solicitud desde OFICERCA</small>
              </div>
            </div>
            <p>Ejemplo ilustrativo de agenda</p>
          </div>
        </div>
      </section>
      <section className="section container faq">
        <div>
          <span className="eyebrow">LAS COSAS CLARAS</span>
          <h2>Antes de empezar.</h2>
          <p>Estamos construyendo OFICERCA paso a paso, empezando por Cáceres.</p>
        </div>
        <div>
          {[
            [
              "¿Y si no sé cuál es el problema?",
              "Ese es un buen punto de partida. Describe lo que notas, elige algunos síntomas y añade fotografías. El profesional decidirá si necesita una visita antes de presupuestar.",
            ],
            [
              "¿Puedo contratar a estos profesionales?",
              "Esta alpha funciona en local con perfiles ficticios identificados como demo. Puedes recorrer todos los pasos, pero no se contratan servicios reales ni se procesan pagos.",
            ],
            [
              "¿Tengo que registrarme para buscar?",
              "Puedes explorar y comparar perfiles sin cuenta y sin dar tu dirección exacta. Necesitas una cuenta para enviar solicitudes y conversar en privado.",
            ],
            [
              "¿También sirve para mis clientes de siempre?",
              "Sí. Como profesional puedes registrar tus propios clientes, añadir sus citas y gestionar su historial. No se les asigna comisión de captación.",
            ],
            [
              "¿Atendéis emergencias?",
              "La alpha se centra en fontanería doméstica no urgente. OFICERCA no es un servicio de emergencias ni garantiza respuesta inmediata.",
            ],
          ].map(([q, a]) => (
            <details key={q}>
              <summary>
                {q}
                <ChevronDown size={18} />
              </summary>
              <p>{a}</p>
            </details>
          ))}
        </div>
      </section>
      <section className="last-cta container">
        <Droplets size={30} />
        <h2>
          Lo que te preocupa en casa,
          <br />
          empieza a resolverse aquí.
        </h2>
        <Link className="btn primary" href="/solicitar">
          Cuéntanos qué ocurre <ArrowRight size={18} />
        </Link>
      </section>
    </>
  );
}
