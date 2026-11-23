import { spawn } from "node:child_process";
import { seed } from "./seed-data";
await seed();
await new Promise<void>((resolve, reject) => {
  const build = spawn(process.execPath, ["node_modules/next/dist/bin/next", "build"], {
    stdio: "inherit",
    env: process.env,
  });
  build.on("error", reject);
  build.on("exit", (code) =>
    code === 0 ? resolve() : reject(new Error(`Compilación E2E fallida: ${code}`)),
  );
});
const child = spawn(
  process.execPath,
  ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", "3100"],
  { stdio: "inherit", env: process.env },
);
for (const signal of ["SIGINT", "SIGTERM"] as const) process.on(signal, () => child.kill(signal));
child.on("exit", (code) => process.exit(code || 0));
