import { NextResponse } from "next/server";
import { normalizeError } from "./accounts";
import { assert } from "./errors";

export function checkOrigin(request: Request) {
  const configured = new URL(process.env.APP_ORIGIN || "http://localhost:3000").origin;
  assert(request.headers.get("origin") === configured, "Origen de la petición no permitido.", 403);
}
export async function boundedBody(request: Request, max: number) {
  const reader = request.body?.getReader();
  assert(reader, "Petición vacía.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > max) {
      await reader.cancel();
      assert(false, "El archivo o formulario supera el tamaño permitido.", 413);
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}
export async function jsonBody(request: Request) {
  assert(
    request.headers.get("content-type")?.includes("application/json"),
    "Formato de petición no admitido.",
    415,
  );
  try {
    return JSON.parse((await boundedBody(request, 64 * 1024)).toString("utf8"));
  } catch (error) {
    if (error instanceof SyntaxError) assert(false, "Formulario no válido.");
    throw error;
  }
}
export function apiError(error: unknown) {
  const normalized = normalizeError(error);
  if (normalized.status === 500)
    console.error(
      "OFICERCA: error de servidor",
      error instanceof Error ? error.message : "Error desconocido",
    );
  return NextResponse.json({ error: normalized.message }, { status: normalized.status });
}
