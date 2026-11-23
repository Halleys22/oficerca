"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowUpRight, Menu, X, Droplets, LogOut } from "lucide-react";
import type { User } from "@/lib/types";
export function Logo() {
  return (
    <Link href="/" className="logo" aria-label="OFICERCA, inicio">
      <span className="logo-symbol">
        <Droplets size={21} strokeWidth={2.4} />
      </span>
      oficerca<span className="logo-dot">.</span>
    </Link>
  );
}
export function Header({ user }: { user: User | null }) {
  const [open, setOpen] = useState(false),
    [error, setError] = useState("");
  const path = usePathname();
  const router = useRouter();
  return (
    <>
      <div className="alpha-strip">
        <span className="live-dot" /> Alpha 0.1 · Fontanería en Cáceres{" "}
        <span className="strip-divider">/</span> <span>Entorno local de demostración</span>
      </div>
      <header className="site-header">
        <div className="header-inner">
          <Logo />
          <button
            className="mobile-menu icon-btn"
            onClick={() => setOpen(!open)}
            aria-label={open ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={open}
          >
            {open ? <X /> : <Menu />}
          </button>
          <nav
            aria-label="Navegación principal"
            className={open ? "nav open" : "nav"}
            onClick={() => setOpen(false)}
          >
            <Link
              className={path.startsWith("/profesionales") ? "active" : ""}
              href="/profesionales"
            >
              Encuentra ayuda
            </Link>
            <Link href="/#como-funciona">Cómo funciona</Link>
            <Link href="/para-profesionales">
              Soy profesional <ArrowUpRight size={14} />
            </Link>
            {user ? (
              <>
                <Link className="btn primary small" href="/panel">
                  Mi espacio
                </Link>
                <button
                  className="icon-btn"
                  aria-label="Cerrar sesión"
                  onClick={async () => {
                    const r = await fetch("/api/auth", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ action: "logout" }),
                    });
                    if (r.ok) {
                      router.push("/");
                      router.refresh();
                    } else setError("No se pudo cerrar la sesión.");
                  }}
                >
                  <LogOut size={18} />
                </button>
              </>
            ) : (
              <Link className="btn primary small" href="/acceso">
                Entrar <ArrowUpRight size={15} />
              </Link>
            )}
          </nav>
        </div>
        {error && (
          <p role="alert" className="text-error">
            {error}
          </p>
        )}
      </header>
    </>
  );
}
