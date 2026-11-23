"use client";
import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight, Check, MapPin, Search, SlidersHorizontal, Star, Video } from "lucide-react";
import type { Professional } from "@/lib/types";
import { initials, money } from "@/lib/format";
import { Empty, Field } from "./ui";

export function ProfessionalCard({
  professional: p,
  index = 0,
}: {
  professional: Professional;
  index?: number;
}) {
  return (
    <article className={`professional-card tone-${index % 4}`}>
      <div className="card-head">
        <div className="avatar avatar-large" aria-hidden="true">
          {initials(p.name)}
          <span className="avatar-arc" />
        </div>
        <span className={p.is_demo ? "demo-tag" : "trade-tag"}>
          {p.is_demo ? "PERFIL DEMO" : "FONTANERÍA"}
        </span>
      </div>
      <div className="professional-card-body">
        <div className="card-name">
          <h3>
            <Link href={`/profesionales/${p.slug}`}>{p.name}</Link>
          </h3>
          {p.review_count ? (
            <span className="rating">
              <Star size={13} />
              {p.rating?.toFixed(1)} <small>({p.review_count})</small>
            </span>
          ) : (
            <small>Sin reseñas aún</small>
          )}
        </div>
        <p className="specialty">{p.specialty}</p>
        <span className="card-location">
          <MapPin size={14} />
          {p.zones?.slice(0, 2).join(" · ") || "Cáceres"}
        </span>
        <div className="card-chips">
          <span>{p.experience} años de experiencia declarada</span>
          {!!p.remote && (
            <span>
              <Video size={12} />
              Consulta remota
            </span>
          )}
        </div>
        <div className="card-bottom">
          <div>
            {p.min_price !== null && p.min_price !== undefined ? (
              <>
                <small>Servicios desde</small>
                <strong>{money(p.min_price)}</strong>
              </>
            ) : (
              <small>Precio tras diagnóstico</small>
            )}
          </div>
          <Link
            href={`/profesionales/${p.slug}`}
            className="round-link"
            aria-label={`Ver perfil de ${p.name}`}
          >
            <ArrowUpRight size={22} />
          </Link>
        </div>
      </div>
    </article>
  );
}
export function Explorer({
  professionals,
  query = "",
}: {
  professionals: Professional[];
  query?: string;
}) {
  const [q, setQ] = useState(query),
    [max, setMax] = useState(""),
    [rating, setRating] = useState("0"),
    [sort, setSort] = useState("recommended"),
    [remote, setRemote] = useState(false),
    [date, setDate] = useState(""),
    [available, setAvailable] = useState<string[] | null>(null),
    [checking, setChecking] = useState(false),
    [error, setError] = useState(""),
    [selected, setSelected] = useState<string[]>([]);
  const normalize = (s: string) =>
    s
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  let result = professionals.filter(
    (p) =>
      (!q ||
        normalize(
          `${p.name} ${p.specialty} fontanería ${p.zones?.join(" ")} ${p.services?.map((s) => s.name).join(" ")}`,
        ).includes(normalize(q))) &&
      (!max ||
        (p.min_price !== null && p.min_price !== undefined && p.min_price <= Number(max) * 100)) &&
      (!Number(rating) || (p.rating || 0) >= Number(rating)) &&
      (!remote || p.remote) &&
      (!available || available.includes(p.id)),
  );
  if (sort === "price")
    result = [...result].sort((a, b) => (a.min_price ?? Infinity) - (b.min_price ?? Infinity));
  if (sort === "experience") result = [...result].sort((a, b) => b.experience - a.experience);
  if (sort === "rating") result = [...result].sort((a, b) => (b.rating || 0) - (a.rating || 0));
  async function checkAvailability() {
    if (!date) {
      setAvailable(null);
      return;
    }
    setChecking(true);
    setError("");
    try {
      const values = await Promise.all(
        professionals.map(async (p) => {
          const services = p.services || [];
          const responses = await Promise.all(
            services.map(async (s) => {
              const r = await fetch(`/api/slots?professional=${p.id}&service=${s.id}&date=${date}`);
              const j = await r.json();
              if (!r.ok) throw new Error(j.error);
              return j.slots.length > 0;
            }),
          );
          return responses.some(Boolean) ? p.id : null;
        }),
      );
      setAvailable(values.filter((v): v is string => !!v));
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo consultar la disponibilidad.");
    } finally {
      setChecking(false);
    }
  }
  return (
    <div className="container section">
      <div className="page-heading">
        <span className="eyebrow">BUENAS MANOS, CERCA DE TI</span>
        <h1>¿Quién te echa una mano?</h1>
        <p>Fontanería doméstica en Cáceres. Compara con calma, habla antes de decidir.</p>
      </div>
      <div className="explorer-search">
        <Search size={20} />
        <input
          aria-label="Buscar por nombre, especialidad o zona"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Nombre, especialidad o zona…"
        />
        <span>
          <MapPin size={16} /> Cáceres
        </span>
      </div>
      <div className="explorer-layout">
        <aside className="filter-panel">
          <h2>
            <SlidersHorizontal size={18} />
            Afina tu búsqueda
          </h2>
          <Field label="Tarifa de entrada máxima">
            <select value={max} onChange={(e) => setMax(e.target.value)}>
              <option value="">Cualquier tarifa</option>
              <option value="20">Hasta 20 €</option>
              <option value="35">Hasta 35 €</option>
              <option value="45">Hasta 45 €</option>
              <option value="60">Hasta 60 €</option>
            </select>
          </Field>
          <Field label="Valoración mínima">
            <select value={rating} onChange={(e) => setRating(e.target.value)}>
              <option value="0">Todas, también sin reseñas</option>
              <option value="4">4 estrellas o más</option>
              <option value="4.5">4,5 estrellas o más</option>
            </select>
          </Field>
          <label className="check-label">
            <input type="checkbox" checked={remote} onChange={(e) => setRemote(e.target.checked)} />
            Ofrece consulta remota
          </label>
          <Field
            label="Con hueco en esta fecha"
            hint="Busca disponibilidad para al menos uno de sus servicios."
          >
            <input
              type="date"
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                setAvailable(null);
              }}
            />
          </Field>
          <button className="btn secondary" disabled={checking} onClick={checkAvailability}>
            {checking ? "Consultando…" : "Consultar huecos"}
          </button>
          {error && (
            <p role="alert" className="text-error">
              {error}
            </p>
          )}
          <button
            className="text-link"
            onClick={() => {
              setQ("");
              setMax("");
              setRating("0");
              setRemote(false);
              setDate("");
              setAvailable(null);
              setError("");
            }}
          >
            Limpiar filtros
          </button>
          <div className="filter-help">
            <MessageMini />
            <strong>¿No sabes qué buscar?</strong>
            <p>Empieza por lo que notas. El profesional te ayudará con el siguiente paso.</p>
            <Link href="/solicitar" className="text-link">
              Describir mi problema <ArrowUpRight size={15} />
            </Link>
          </div>
        </aside>
        <div>
          <div className="results-top">
            <span>
              {result.length} {result.length === 1 ? "profesional" : "profesionales"}
              {available ? " con huecos" : ""}
            </span>
            <label>
              Ordenar por{" "}
              <select
                aria-label="Ordenar profesionales"
                value={sort}
                onChange={(e) => setSort(e.target.value)}
              >
                <option value="recommended">Orden de presentación</option>
                <option value="price">Menor tarifa inicial</option>
                <option value="experience">Más experiencia</option>
                <option value="rating">Mejor valoración</option>
              </select>
            </label>
          </div>
          <p className="demo-note">
            <span className="demo-tag">DEMO</span> Los perfiles marcados son ficticios. No se ha
            verificado su identidad ni experiencia.
          </p>
          <div className="professional-grid explorer-grid">
            {result.map((p, i) => (
              <div key={p.id}>
                <ProfessionalCard professional={p} index={i} />
                <label className="compare-check">
                  <input
                    type="checkbox"
                    checked={selected.includes(p.id)}
                    disabled={!selected.includes(p.id) && selected.length >= 3}
                    onChange={(e) =>
                      setSelected(
                        e.target.checked ? [...selected, p.id] : selected.filter((v) => v !== p.id),
                      )
                    }
                  />
                  {selected.includes(p.id) ? <Check size={13} /> : null}Comparar perfil
                </label>
              </div>
            ))}
          </div>
          {!result.length && (
            <Empty title="No encontramos esa combinación">
              Prueba otra zona, amplía la tarifa o limpia los filtros.
            </Empty>
          )}
          {selected.length > 0 && (
            <div className="comparison">
              <div className="section-heading">
                <h2>Compara tus opciones</h2>
                <button className="text-link" onClick={() => setSelected([])}>
                  Quitar selección
                </button>
              </div>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Profesional</th>
                      <th>Especialidad</th>
                      <th>Tarifa de entrada</th>
                      <th>Modalidad</th>
                      <th>Confirmación</th>
                    </tr>
                  </thead>
                  <tbody>
                    {professionals
                      .filter((p) => selected.includes(p.id))
                      .map((p) => (
                        <tr key={p.id}>
                          <td>
                            <Link className="text-link" href={`/profesionales/${p.slug}`}>
                              {p.name}
                            </Link>
                          </td>
                          <td>{p.specialty}</td>
                          <td>{p.min_price == null ? "Tras diagnóstico" : money(p.min_price)}</td>
                          <td>{p.remote ? "Presencial y remota" : "Presencial"}</td>
                          <td>{p.auto_confirm ? "Automática" : "Manual"}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
function MessageMini() {
  return (
    <span className="step-icon">
      <Search size={20} />
    </span>
  );
}
