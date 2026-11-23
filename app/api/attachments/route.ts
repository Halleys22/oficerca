import { NextResponse } from "next/server";
import sharp from "sharp";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import { z } from "@/lib/validation";
import { requireUser } from "@/lib/auth";
import { rateLimit } from "@/lib/accounts";
import { accessibleRequest } from "@/lib/queries";
import { all, id, one, run, transaction } from "@/lib/db";
import { assert } from "@/lib/errors";
import { apiError, boundedBody, checkOrigin } from "@/lib/http";
import { notify } from "@/lib/actions";
import { uploadsDirectory } from "@/lib/files";
export const runtime = "nodejs";
export async function POST(request: Request) {
  let outputPath: string | undefined;
  try {
    checkOrigin(request);
    const user = await requireUser();
    rateLimit(`upload:${user.id}`, 30, 60 * 60_000);
    const bytes = await boundedBody(request, 6 * 1024 * 1024);
    const form = await new Response(bytes, {
      headers: { "Content-Type": request.headers.get("content-type") || "" },
    }).formData();
    const rid = z.string().uuid().parse(form.get("requestId"));
    const { request: r, pro } = accessibleRequest(user, rid);
    const messageId = form.get("messageId");
    if (messageId)
      assert(
        one(
          "SELECT m.id FROM messages m JOIN conversations c ON c.id=m.conversation_id WHERE m.id=? AND m.sender_id=? AND c.request_id=?",
          z.string().uuid().parse(messageId),
          user.id,
          rid,
        ),
        "Mensaje no encontrado.",
        404,
      );
    const file = form.get("file");
    assert(
      file instanceof File && file.size > 0 && file.size <= 5 * 1024 * 1024,
      "Elige una fotografía JPG, PNG o WebP de hasta 5 MB.",
    );
    assert(
      all("SELECT id FROM attachments WHERE request_id=?", rid).length < 30,
      "Esta solicitud ha alcanzado el límite de 30 fotografías.",
    );
    const source = Buffer.from(await file.arrayBuffer());
    const metadata = await sharp(source, { limitInputPixels: 25_000_000 })
      .metadata()
      .catch(() => {
        assert(
          false,
          "El archivo no es una fotografía válida o supera el límite de 25 megapíxeles.",
        );
      });
    assert(
      ["jpeg", "png", "webp"].includes(metadata.format || "") && (metadata.pages || 1) === 1,
      "Solo se admiten imágenes JPG, PNG o WebP sin animación.",
    );
    const output = await sharp(source, { limitInputPixels: 25_000_000 })
      .rotate()
      .resize(2000, 2000, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();
    const aid = id(),
      storageName = `${aid}.webp`;
    const folder = uploadsDirectory();
    await mkdir(folder, { recursive: true });
    outputPath = path.join(folder, storageName);
    await writeFile(outputPath, output, { flag: "wx" });
    transaction(() => {
      accessibleRequest(user, rid);
      assert(
        all("SELECT id FROM attachments WHERE request_id=?", rid).length < 30,
        "Límite de fotografías alcanzado.",
      );
      run(
        "INSERT INTO attachments VALUES (?,?,?,?,?,?,?,?,?)",
        aid,
        rid,
        typeof messageId === "string" ? messageId : null,
        user.id,
        file.name.slice(0, 120),
        storageName,
        "image/webp",
        output.length,
        Date.now(),
      );
      notify(
        user.id === r.client_id ? pro.user_id : r.client_id,
        rid,
        "Se ha añadido una fotografía a la solicitud.",
      );
    });
    return NextResponse.json({ id: aid });
  } catch (e) {
    if (outputPath) await unlink(outputPath).catch(() => {});
    return apiError(e);
  }
}
