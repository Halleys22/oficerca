import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { requestDetail } from "@/lib/queries";
import { apiError } from "@/lib/http";
export const dynamic = "force-dynamic";
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    return NextResponse.json(requestDetail(await requireUser(), (await params).id), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (e) {
    return apiError(e);
  }
}
