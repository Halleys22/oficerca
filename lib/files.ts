import path from "node:path";

/** Private uploads may be isolated alongside an independent test database. */
export function uploadsDirectory() {
  return path.resolve(
    // Private files are runtime data, never assets to trace into a deployment bundle.
    /* turbopackIgnore: true */
    process.env.UPLOADS_PATH ||
      path.join(path.dirname(process.env.DATABASE_PATH || "./data/oficerca.db"), "uploads"),
  );
}
