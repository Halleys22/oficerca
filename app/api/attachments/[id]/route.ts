import { readFile } from "node:fs/promises";
import path from "node:path";
import { one } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { accessibleRequest } from "@/lib/queries";
import { assert } from "@/lib/errors";
import { apiError } from "@/lib/http";
import { uploadsDirectory } from "@/lib/files";
export const runtime = "nodejs";
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const file = one<{ request_id: string; storage_name: string }>(
      "SELECT request_id,storage_name FROM attachments WHERE id=?",
      (await params).id,
    );
    assert(file, "Archivo no encontrado.", 404);
    accessibleRequest(user, file.request_id);
    assert(/^[a-f0-9-]+\.webp$/.test(file.storage_name), "Archivo no válido.", 404);
    const buffer = await readFile(path.join(uploadsDirectory(), file.storage_name));
    return new Response(buffer, {
      headers: {
        "Content-Type": "image/webp",
        "Content-Disposition": "inline",
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (e) {
    return apiError(e);
  }
}
