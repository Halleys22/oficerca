import { it, expect } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { database, one, openDatabase } from "../lib/db";
import { addDays, madridDate, wallInstant } from "../lib/availability";
import { fixture } from "./fixture";

it("dos procesos concurrentes compiten por un hueco: solo uno reserva; los datos sobreviven al reinicio", async () => {
  const folder = mkdtempSync(path.join(tmpdir(), "oficerca-test-")),
    filename = path.join(folder, "race.db");
  const store = globalThis as unknown as { oficercaDb?: ReturnType<typeof openDatabase> };
  store.oficercaDb = openDatabase(filename);
  try {
    const f = fixture(),
      a = f.acceptedRequest(),
      b = f.acceptedRequest(f.client2),
      time = wallInstant(addDays(madridDate(), 2), 600);
    function reserve(uid: string, rid: string) {
      return new Promise<{ ok: boolean; status?: number }>((resolve, reject) => {
        const child = spawn(
          process.execPath,
          ["--import", "tsx", "tests/helpers/reserve.ts", uid, rid, f.sid, String(time)],
          { cwd: process.cwd(), env: { ...process.env, DATABASE_PATH: filename } },
        );
        let stdout = "",
          stderr = "";
        child.stdout.on("data", (d) => (stdout += d));
        child.stderr.on("data", (d) => (stderr += d));
        child.on("error", reject);
        child.on("exit", (code) => {
          if (code !== 0) reject(new Error(stderr));
          else
            try {
              resolve(JSON.parse(stdout.trim()));
            } catch {
              reject(new Error(stdout + stderr));
            }
        });
      });
    }
    const results = await Promise.all([reserve(f.client.id, a.rid), reserve(f.client2.id, b.rid)]);
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(results.find((r) => !r.ok)?.status).toBe(409);
    expect(one<{ n: number }>("SELECT COUNT(*) AS n FROM bookings")?.n).toBe(1);
    database().close();
    store.oficercaDb = undefined;
    const reopened = openDatabase(filename);
    expect(reopened.prepare("SELECT COUNT(*) AS n FROM bookings").get()?.n).toBe(1);
    reopened.close();
  } finally {
    store.oficercaDb?.close();
    store.oficercaDb = undefined;
    if (
      path.dirname(folder) === path.resolve(tmpdir()) &&
      path.basename(folder).startsWith("oficerca-test-")
    )
      rmSync(folder, { recursive: true, force: true });
  }
}, 30000);
