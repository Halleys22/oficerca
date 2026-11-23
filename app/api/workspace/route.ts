import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { workspace } from "@/lib/queries";
import { apiError } from "@/lib/http";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    return NextResponse.json(workspace(await requireUser()), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (e) {
    return apiError(e);
  }
}
