"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  Check,
  MapPin,
  MessageCircle,
  Sparkles,
  X,
} from "lucide-react";
import type { Professional } from "@/lib/types";
import { initials } from "@/lib/format";
import { apiAction, Feedback, Field } from "./ui";
const symptoms = [
  "Goteo o fuga",
  "Ruido extraño",
  "Falta de presión",
  "Atasco o desagüe lento",
  "Agua donde no debería",
  "No lo tengo claro",
];
export function RequestWizard({
  professionals,
  professionalId,
  serviceId,
}: {
  professionals: Professional[];
  professionalId?: string;
  serviceId?: string;
}) {
  const [step, setStep] = useState(1),
    [pid, setPid] = useState(professionalId || ""),
    [title, setTitle] = useState(""),
    [description, setDescription] = useState(""),
    [selectedSymptoms, setSymptoms] = useState<string[]>([]),
    [mode, setMode] = useState("onsite"),
    [files, setFiles] = useState<File[]>([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [requestId, setRequestId] = useState("");
  const router = useRouter();
  const pro = professionals.find((p) => p.id === pid);
  const service = pro?.services?.find((s) => s.id === serviceId);
  function next() {
    setError("");
    if (step === 1 && (title.trim().length < 4 || description.trim().length < 15)) {
      setError("Añade un título de al menos 4 caracteres y describe el problema con al menos 15.");
      return;
    }
    if (step === 2 && !pro) {
      setError("Elige a quién quieres enviar la consulta.");
      return;
    }
    setStep(step + 1);
  }
  async function submit() {
    setBusy(true);
    setError("");
    try {
      let rid = requestId;
      if (!rid) {
        const result = await apiAction("request.create", {
          professionalId: pid,
          title,
          description,
          symptoms: selectedSymptoms,
          mode,
        });
        rid = result.id!;
        setRequestId(rid);
      }
      const pending = [...files];
      for (const file of pending) {
        const form = new FormData();
        form.set("requestId", rid);
        form.set("file", file);
        const r = await fetch("/api/attachments", { method: "POST", body: form });
        if (!r.ok) {
          const d = await r.json();
          throw new Error(
            `La solicitud está guardada, pero no se ha podido subir «${file.name}»: ${d.error}. Puedes continuar al expediente o volver a intentarlo.`,
          );
        }
        setFiles((v) => v.filter((f) => f !== file));
      }
      router.push(`/solicitudes/${rid}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo enviar la solicitud.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="container section wizard-layout">
      <aside>
        <Link href="/profesionales" className="back-link">
          <ArrowLeft size={16} />
          Volver a profesionales
        </Link>
        <span className="eyebrow">NO NECESITAS SABER DE FONTANERÍA</span>
        <h1>
          Empecemos
          <br />
          por lo que notas.
        </h1>
        <p>Tú nos cuentas lo que ocurre. El profesional te ayudará a decidir el siguiente paso.</p>
        <ol className="wizard-steps">
          {["Cuéntanos el problema", "Elige tus buenas manos", "Revisa y envía"].map((label, i) => (
            <li className={step === i + 1 ? "current" : step > i + 1 ? "done" : ""} key={label}>
              <span>{step > i + 1 ? <Check size={15} /> : i + 1}</span>
              {label}
            </li>
          ))}
        </ol>
        <div className="info-box">
          <Sparkles size={20} />
          <p>
            Esto inicia una conversación. No es un diagnóstico automático ni una reserva. Nadie te
            pedirá que calcules cuánto durará la reparación.
          </p>
        </div>
      </aside>
      <div className="panel-card wizard-card">
        <span className="eyebrow">PASO {step} DE 3</span>
        {step === 1 ? (
          <>
            <h2>¿Qué ocurre en casa?</h2>
            <div className="stack">
              <Field label="Un título que lo resuma">
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Por ejemplo: el grifo de la cocina gotea"
                  maxLength={120}
                  disabled={!!requestId}
                />
              </Field>
              <Field
                label="Descríbelo con tus palabras"
                hint="Desde cuándo pasa, qué has notado y dónde. Evita incluir datos sensibles o tu dirección exacta."
              >
                <textarea
                  rows={5}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={5000}
                  placeholder="No hace falta saber el nombre de la pieza…"
                  disabled={!!requestId}
                />
              </Field>
              <fieldset className="form-fields">
                <legend>
                  ¿Has notado algo de esto? <small>Opcional</small>
                </legend>
                <div className="symptom-options">
                  {symptoms.map((s) => (
                    <label
                      className={selectedSymptoms.includes(s) ? "symptom selected" : "symptom"}
                      key={s}
                    >
                      <input
                        type="checkbox"
                        checked={selectedSymptoms.includes(s)}
                        onChange={(e) =>
                          setSymptoms(
                            e.target.checked
                              ? [...selectedSymptoms, s]
                              : selectedSymptoms.filter((v) => v !== s),
                          )
                        }
                      />
                      {s}
                    </label>
                  ))}
                </div>
              </fieldset>
              <Field
                label="Una foto puede ayudar"
                hint="Opcional · hasta 5 fotos · JPG, PNG o WebP · máximo 5 MB por foto. Se eliminan los metadatos."
              >
                <span className="upload-area">
                  <Camera size={25} />
                  <span>Añadir fotografías</span>
                  <input
                    aria-label="Adjuntar fotografías"
                    type="file"
                    multiple
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => {
                      const added = [...Array.from(e.target.files || [])];
                      if (
                        added.some((f) => f.size > 5 * 1024 * 1024) ||
                        files.length + added.length > 5
                      ) {
                        setError("Elige hasta 5 fotografías de un máximo de 5 MB cada una.");
                        return;
                      }
                      setFiles([...files, ...added]);
                      e.target.value = "";
                    }}
                  />
                </span>
              </Field>
              {files.map((f, i) => (
                <div className="file-chip" key={`${f.name}-${i}`}>
                  <Camera size={15} />
                  {f.name}
                  <button
                    type="button"
                    className="icon-btn"
                    aria-label={`Quitar ${f.name}`}
                    onClick={() => setFiles(files.filter((_, n) => n !== i))}
                  >
                    <X size={15} />
                  </button>
                </div>
              ))}
            </div>
          </>
        ) : step === 2 ? (
          <>
            <h2>¿Con quién lo hablamos?</h2>
            <p>Elige un profesional. Puedes consultar sus perfiles antes de enviar nada.</p>
            <div className="professional-choices">
              {professionals.map((p) => (
                <label key={p.id} className={pid === p.id ? "pro-choice selected" : "pro-choice"}>
                  <input
                    type="radio"
                    name="professional"
                    checked={pid === p.id}
                    onChange={() => {
                      setPid(p.id);
                      if (!p.remote) setMode("onsite");
                    }}
                  />
                  <span className="avatar">{initials(p.name)}</span>
                  <span>
                    <strong>{p.name}</strong>
                    <small>{p.specialty}</small>
                    <span className="demo-tag">{p.is_demo ? "DEMO" : "FONTANERÍA"}</span>
                  </span>
                  <Link
                    href={`/profesionales/${p.slug}`}
                    target="_blank"
                    className="text-link"
                    aria-label={`Ver perfil de ${p.name} en nueva pestaña`}
                  >
                    Ver perfil
                  </Link>
                </label>
              ))}
            </div>
            <Field label="¿Cómo prefieres empezar?">
              <select value={mode} onChange={(e) => setMode(e.target.value)}>
                <option value="onsite">Necesito atención presencial</option>
                {!!pro?.remote && (
                  <option value="remote">Consulta remota por mensajes y fotos</option>
                )}
              </select>
            </Field>
            <p className="muted small-text">
              <MapPin size={14} />
              La dirección se acuerda en privado cuando haga falta.
            </p>
          </>
        ) : (
          <>
            <h2>Así empieza la solución.</h2>
            <div className="request-summary">
              <h3>{title}</h3>
              <p className="preserve">{description}</p>
              <div className="card-chips">
                {selectedSymptoms.map((s) => (
                  <span key={s}>{s}</span>
                ))}
              </div>
              <hr />
              <p>
                <strong>Profesional:</strong> {pro?.name}
                {pro?.is_demo ? " · perfil ficticio" : ""}
              </p>
              <p>
                <strong>Modalidad:</strong>{" "}
                {mode === "remote" ? "Consulta remota por mensajes" : "Atención presencial"}
              </p>
              {service && (
                <p>
                  <strong>Servicio consultado:</strong> {service.name}
                </p>
              )}
              <p>
                <strong>Fotografías:</strong> {files.length}
              </p>
            </div>
            <div className="info-box">
              <MessageCircle size={21} />
              <p>
                Se abrirá una conversación privada. El profesional podrá pedir más información o una
                inspección antes de presupuestar. No se realiza ningún pago.
              </p>
            </div>
          </>
        )}
        <Feedback error={error} />
        <div className="wizard-actions">
          {step > 1 && !requestId && (
            <button
              className="btn secondary"
              onClick={() => {
                setError("");
                setStep(step - 1);
              }}
              disabled={busy}
            >
              <ArrowLeft size={16} />
              Anterior
            </button>
          )}
          {step < 3 ? (
            <button className="btn primary" onClick={next}>
              Continuar <ArrowRight size={17} />
            </button>
          ) : (
            <button className="btn primary" disabled={busy} onClick={submit}>
              {busy ? "Guardando…" : requestId ? "Reintentar fotografías" : "Enviar mi consulta"}
              <ArrowRight size={17} />
            </button>
          )}
        </div>
        {requestId && error && (
          <Link className="text-link" href={`/solicitudes/${requestId}`}>
            Continuar al expediente guardado <ArrowRight size={15} />
          </Link>
        )}
      </div>
    </div>
  );
}
