import { NextResponse } from "next/server";
import { slotsForDate } from "@/lib/availability";
import { apiError } from "@/lib/http";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    const q = new URL(request.url).searchParams;
    return NextResponse.json(
      {
        slots: slotsForDate(
          q.get("professional") || "",
          q.get("service") || "",
          q.get("date") || "",
        ),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return apiError(e);
  }
}
