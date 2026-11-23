import { NextResponse } from "next/server";
import { authenticate, register } from "@/lib/accounts";
import { currentUser, session } from "@/lib/auth";
import { run } from "@/lib/db";
import { apiError, checkOrigin, jsonBody } from "@/lib/http";
export const runtime = "nodejs";
export async function GET() {
  try {
    return NextResponse.json(
      { user: await currentUser() },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (e) {
    return apiError(e);
  }
}
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const data = await jsonBody(request);
    const s = await session();
    if (data.action === "logout") {
      const user = await currentUser();
      if (user) run("UPDATE users SET session_version=session_version+1 WHERE id=?", user.id);
      s.destroy();
      return NextResponse.json({ ok: true });
    }
    const user = data.action === "register" ? await register(data) : await authenticate(data);
    s.userId = user.id;
    s.version = user.session_version;
    await s.save();
    return NextResponse.json({ user });
  } catch (e) {
    return apiError(e);
  }
}
