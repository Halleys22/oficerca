"use client";
import {
  cloneElement,
  isValidElement,
  useId,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, LoaderCircle } from "lucide-react";
import { labels } from "@/lib/format";

export async function apiAction(action: string, data: unknown) {
  const response = await fetch("/api/action", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, data }),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "No se pudo guardar el cambio.");
  return result as { id?: string };
}
export function Status({ value }: { value: string }) {
  return <span className={`status status-${value}`}>{labels[value] || value}</span>;
}
export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  const hintId = useId();
  const control =
    isValidElement<{ "aria-describedby"?: string }>(children) &&
    typeof children.type === "string" &&
    ["input", "select", "textarea"].includes(children.type)
      ? cloneElement(children, {
          "aria-describedby":
            [children.props["aria-describedby"], hint ? hintId : ""].filter(Boolean).join(" ") ||
            undefined,
        })
      : children;
  return (
    <div className="field">
      <label className="field-label">
        <span>{label}</span>
        {control}
      </label>
      {hint && <small id={hintId}>{hint}</small>}
    </div>
  );
}
export function Feedback({ error, success }: { error?: string; success?: string }) {
  return (
    <>
      {error && (
        <p className="feedback error" role="alert">
          <AlertCircle size={17} />
          {error}
        </p>
      )}
      {success && (
        <p className="feedback success" role="status">
          <CheckCircle2 size={17} />
          {success}
        </p>
      )}
    </>
  );
}
export function Submit({
  busy,
  children = "Guardar cambios",
  className = "btn primary",
}: {
  busy: boolean;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <button type="submit" className={className} disabled={busy}>
      {busy ? (
        <>
          <LoaderCircle className="spin" size={17} />
          Guardando…
        </>
      ) : (
        children
      )}
    </button>
  );
}
export function ActionForm({
  action,
  data,
  children,
  onSuccess,
  reset = false,
  success = "Cambios guardados.",
  className = "stack",
  submitLabel = "Guardar cambios",
}: {
  action: string;
  data: (form: FormData) => unknown;
  children: ReactNode;
  onSuccess?: (result: { id?: string }) => void;
  reset?: boolean;
  success?: string;
  className?: string;
  submitLabel?: string;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [done, setDone] = useState("");
  const router = useRouter();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = event.currentTarget;
    setBusy(true);
    setError("");
    setDone("");
    try {
      const result = await apiAction(action, data(new FormData(form)));
      if (reset) form.reset();
      setDone(success);
      onSuccess?.(result);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className={className} onSubmit={submit}>
      <fieldset disabled={busy} className="form-fields">
        {children}
      </fieldset>
      <Feedback error={error} success={done} />
      <Submit busy={busy}>{submitLabel}</Submit>
    </form>
  );
}
export function ActionButton({
  action,
  data,
  children,
  className = "btn secondary",
  onSuccess,
}: {
  action: string;
  data: unknown;
  children: ReactNode;
  className?: string;
  onSuccess?: () => void;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const router = useRouter();
  return (
    <span className="action-wrap">
      <button
        className={className}
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError("");
          try {
            await apiAction(action, data);
            onSuccess?.();
            router.refresh();
          } catch (e) {
            setError(e instanceof Error ? e.message : "No se pudo guardar.");
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? <LoaderCircle size={16} className="spin" /> : children}
      </button>
      {error && (
        <small role="alert" className="text-error">
          {error}
        </small>
      )}
    </span>
  );
}
export const val = (f: FormData, k: string) => String(f.get(k) || "");
export const num = (f: FormData, k: string) => Number(f.get(k));
export const toCents = (f: FormData, k: string) =>
  Math.round(Number(String(f.get(k) || "0").replace(",", ".")) * 100);
export function Empty({
  title,
  children,
  icon,
}: {
  title: string;
  children: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="empty">
      {icon}
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  );
}
