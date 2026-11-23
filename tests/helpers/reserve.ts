import { performAction } from "../../lib/actions";
import { userById, normalizeError } from "../../lib/accounts";
import { database } from "../../lib/db";
const [uid, rid, sid, startsAt] = process.argv.slice(2);
try {
  const result = performAction(userById(uid)!, "booking.create", {
    requestId: rid,
    serviceId: sid,
    startsAt: Number(startsAt),
  });
  console.log(JSON.stringify({ ok: true, id: result.id }));
} catch (e) {
  console.log(JSON.stringify({ ok: false, status: normalizeError(e).status }));
} finally {
  database().close();
}
