import { existsSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { seed } from "./seed-data";
if (!existsSync(".env.local"))
  writeFileSync(
    ".env.local",
    `SESSION_SECRET=${randomBytes(48).toString("base64url")}\nAPP_ORIGIN=http://localhost:3000\nSECURE_COOKIES=false\nDEMO_MODE=true\nDATABASE_PATH=./data/oficerca.db\nNEXT_TELEMETRY_DISABLED=1\n`,
    { flag: "wx" },
  );
await seed();
console.log("OFICERCA preparada. Ejecuta npm run dev y abre http://localhost:3000");
