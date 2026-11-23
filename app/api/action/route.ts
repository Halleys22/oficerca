import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { rateLimit } from "@/lib/accounts";
import { performAction } from "@/lib/actions";
import { apiError, checkOrigin, jsonBody } from "@/lib/http";
import { assert } from "@/lib/errors";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const user = await requireUser();
    rateLimit(`action:${user.id}`, 120, 60_000);
    const data = await jsonBody(request);
    assert(typeof data.action === "string", "Acción no válida.");
    return NextResponse.json(performAction(user, data.action, data.data));
  } catch (e) {
    return apiError(e);
  }
}
