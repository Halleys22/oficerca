import { test, expect, type Page, type BrowserContext } from "@playwright/test";
import sharp from "sharp";
import { DatabaseSync } from "node:sqlite";
import { nextDate, dayKey } from "../lib/client-time";

async function login(page: Page, role: "Cliente" | "Profesional" | "Administración") {
  await page.goto("/acceso");
  await page.getByRole("button", { name: role, exact: true }).click();
  await page.getByRole("button", { name: "Entrar en mi espacio" }).click();
  await expect(page).toHaveURL(/\/panel/);
}
async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
}
async function capture(page: Page, file: string) {
  await page.evaluate(() => {
    (document.activeElement as HTMLElement)?.blur();
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  });
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
  await page.screenshot({ path: `test-results/${file}`, fullPage: true });
}
function workingDay() {
  let day = nextDate(dayKey(), 4);
  while ([0, 6].includes(new Date(day + "T12:00:00Z").getUTCDay())) day = nextDate(day, 1);
  return day;
}
async function post(context: BrowserContext, action: string, data: unknown) {
  return context.request.post("/api/action", {
    headers: { Origin: "http://localhost:3100" },
    data: { action, data },
  });
}

test("landing, búsqueda, comparación y diseño responsive", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /No tienes que/ })).toBeVisible();
  await noOverflow(page);
  await capture(page, "landing-desktop.png");
  await page.getByRole("textbox", { name: "Qué necesitas" }).fill("grifería");
  await page.getByRole("button", { name: "Buscar profesionales" }).click();
  await expect(page).toHaveURL(/profesionales/);
  await expect(page.getByRole("heading", { name: "Javier Moreno" })).toBeVisible();
  await page.getByRole("button", { name: "Limpiar filtros" }).click();
  await page.getByLabel("Comparar perfil").nth(0).check();
  await page.getByLabel("Comparar perfil").nth(1).check();
  await expect(page.getByRole("heading", { name: "Compara tus opciones" })).toBeVisible();
  await noOverflow(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await noOverflow(page);
  await capture(page, "landing-mobile.png");
  await page.getByRole("button", { name: "Abrir menú" }).click();
  await page
    .getByRole("navigation", { name: "Navegación principal" })
    .getByRole("link", { name: "Encuentra ayuda" })
    .click();
  await noOverflow(page);
  await page.getByRole("heading", { name: "Javier Moreno" }).getByRole("link").click();
  await noOverflow(page);
  await expect(page.getByRole("heading", { name: "Javier Moreno", exact: true })).toBeVisible();
  for (const width of [320, 360, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await noOverflow(page);
  }
  expect(errors).toEqual([]);
});

test("cliente y profesional: solicitud con foto, conversación, presupuesto, reserva, cancelación e incidencia", async ({
  browser,
}) => {
  const customer = await browser.newContext({ baseURL: "http://localhost:3100" }),
    pro = await browser.newContext({ baseURL: "http://localhost:3100" }),
    admin = await browser.newContext({ baseURL: "http://localhost:3100" });
  const c = await customer.newPage(),
    p = await pro.newPage(),
    a = await admin.newPage();
  await login(c, "Cliente");
  await login(p, "Profesional");
  await c.goto("/profesionales/javier-moreno");
  await c.getByRole("link", { name: "Enviar una consulta" }).click();
  await c.getByLabel("Un título que lo resuma").fill("E2E · El grifo del lavabo gotea");
  await c
    .getByLabel("Descríbelo con tus palabras")
    .fill(
      "El grifo del lavabo gotea desde ayer aunque está cerrado. Quisiera una visita para revisarlo.",
    );
  const photo = await sharp({
    create: { width: 50, height: 50, channels: 3, background: "#c5d7ad" },
  })
    .png()
    .toBuffer();
  await c
    .getByLabel("Adjuntar fotografías")
    .setInputFiles({ name: "grifo-demo.png", mimeType: "image/png", buffer: photo });
  await c.getByText("Goteo o fuga", { exact: true }).click();
  await c.getByRole("button", { name: "Continuar" }).click();
  await c.getByRole("button", { name: "Continuar" }).click();
  await c.getByRole("button", { name: "Enviar mi consulta" }).click();
  await expect(c).toHaveURL(/\/solicitudes\//);
  const requestUrl = c.url();
  await expect(c.getByRole("heading", { name: "E2E · El grifo del lavabo gotea" })).toBeVisible();
  await expect(c.getByRole("img", { name: "grifo-demo.png" })).toBeVisible();
  await c.getByLabel("Tu mensaje").fill("La fuga sale por la base del grifo.");
  await c.getByRole("button", { name: "Enviar", exact: true }).click();
  await expect(c.getByText("La fuga sale por la base del grifo.", { exact: true })).toBeVisible();
  await p.goto(requestUrl);
  await p.getByLabel("Tu mensaje").fill("Gracias por la foto. Te propongo una visita de revisión.");
  await p.getByRole("button", { name: "Enviar", exact: true }).click();
  await expect(
    p.getByText("Gracias por la foto. Te propongo una visita de revisión.", { exact: true }),
  ).toBeVisible();
  await p.getByText("Preparar y enviar presupuesto", { exact: true }).click();
  await p
    .getByRole("textbox", { name: "Concepto 1", exact: true })
    .fill("Visita de revisión del grifo");
  await p.getByLabel("Precio total/ud. (€)").fill("35");
  await p
    .getByLabel("Alcance, impuestos, gastos y condiciones")
    .fill(
      "Visita y revisión. Total con impuestos y desplazamiento incluidos; recambios no incluidos.",
    );
  await p.getByRole("button", { name: "Enviar presupuesto", exact: true }).click();
  await expect(p.getByText("Propuesta · versión 1", { exact: true })).toBeVisible();
  await c.reload();
  await c.getByRole("button", { name: "Aceptar propuesta" }).click();
  await expect(c.getByRole("heading", { name: "Un hueco para la solución." })).toBeVisible();
  const booking = c.locator("#reservar");
  await booking.getByLabel("Fecha · hora de Madrid").fill(workingDay());
  const firstSlot = booking.getByRole("button", { name: /^\d{2}:\d{2}$/ }).first();
  await expect(firstSlot).toBeVisible();
  const slotLabel = await firstSlot.innerText();
  await firstSlot.click();
  await booking.getByRole("button", { name: "Solicitar esta reserva" }).click();
  await expect(c.getByRole("heading", { name: "Citas de esta solicitud" })).toBeVisible();
  await expect(c.locator(".booking-list .status-pending")).toBeVisible();
  await p.reload();
  await p.getByRole("button", { name: "Confirmar cita", exact: true }).click();
  await expect(p.locator(".booking-list .status-confirmed")).toBeVisible();
  await c.reload();
  await c.getByText("Gestionar esta cita", { exact: true }).click();
  await c
    .getByLabel("Motivo de la cancelación")
    .fill("Necesito otro día y lo he comentado por mensajes.");
  await c.getByRole("button", { name: "Cancelar la cita", exact: true }).click();
  await expect(c.locator(".booking-list .status-cancelled")).toBeVisible();
  await expect(c.getByText("La fuga sale por la base del grifo.", { exact: true })).toBeVisible();
  await expect(c.locator("#reservar")).toBeVisible();
  await c.locator("#reservar").getByLabel("Fecha · hora de Madrid").fill(workingDay());
  await expect(
    c.locator("#reservar").getByRole("button", { name: slotLabel, exact: true }),
  ).toBeVisible();
  await c.getByText("Abrir una incidencia", { exact: true }).click();
  const incidentForm = c
    .locator("form")
    .filter({ has: c.getByRole("button", { name: "Abrir incidencia", exact: true }) });
  await incidentForm
    .getByLabel("Motivo", { exact: true })
    .fill("E2E · Aclarar el alcance de la visita");
  await incidentForm
    .getByLabel("Explica qué ha ocurrido")
    .fill(
      "Necesito que quede documentado si la visita incluye una pieza nueva o solo la revisión.",
    );
  await incidentForm.getByRole("button", { name: "Abrir incidencia", exact: true }).click();
  await expect(
    c.getByRole("heading", { name: "E2E · Aclarar el alcance de la visita" }),
  ).toBeVisible();
  await p.reload();
  await p
    .getByLabel("Tu respuesta")
    .fill("La propuesta contempla la revisión; las piezas requieren nueva propuesta.");
  await p.getByRole("button", { name: "Añadir respuesta", exact: true }).click();
  await login(a, "Administración");
  await expect(
    a.getByRole("heading", { name: "E2E · Aclarar el alcance de la visita" }),
  ).toBeVisible();
  const incident = a
    .locator(".incident-card")
    .filter({ has: a.getByRole("heading", { name: "E2E · Aclarar el alcance de la visita" }) });
  await incident.getByText("Revisar estado administrativo", { exact: true }).click();
  await incident
    .getByLabel("Explicación visible a las partes")
    .fill("Se revisa la explicación de ambas partes.");
  await incident.getByRole("button", { name: "Guardar revisión" }).click();
  await expect(incident.locator(".status-reviewing")).toBeVisible();
  await incident.getByRole("combobox", { name: "Estado", exact: true }).selectOption("closed");
  await incident
    .getByLabel("Explicación visible a las partes")
    .fill("Alcance documentado por ambas partes, sin decisión económica.");
  await incident.getByRole("button", { name: "Guardar revisión" }).click();
  await expect(incident.locator(".status-closed")).toBeVisible();
  await c.setViewportSize({ width: 390, height: 844 });
  await c.reload();
  await noOverflow(c);
  await capture(c, "request-mobile.png");
  await p.goto("/panel");
  await capture(p, "pro-dashboard-desktop.png");
  await customer.close();
  await pro.close();
  await admin.close();
});

test("profesional edita perfil, servicio y horario; añade cliente propio y cita sin captación", async ({
  page,
}) => {
  await login(page, "Profesional");
  await page.goto("/panel?tab=perfil");
  await page.getByLabel("Nombre comercial").fill("Javier Moreno · Fontanería demo");
  await page.getByRole("button", { name: "Guardar mi perfil" }).click();
  await expect(page.getByRole("status")).toContainText("Cambios guardados");
  await page.goto("/panel?tab=servicios");
  const service = page.locator("aside.panel-card");
  await service.getByLabel("Nombre del servicio").fill("E2E · Revisión preventiva");
  await service
    .getByLabel("Descripción y alcance")
    .fill("Visita preventiva de fontanería de demostración.");
  await service.getByLabel("Importe total (€)").fill("42");
  await service.getByRole("button", { name: "Crear servicio" }).click();
  await expect(
    page.locator("summary").filter({ hasText: "E2E · Revisión preventiva" }),
  ).toBeVisible();
  await page.goto("/panel?tab=disponibilidad");
  await page.getByLabel("Antelación mínima (min)").fill("60");
  await page.getByLabel("Descanso entre citas (min)").fill("30");
  await page.getByRole("button", { name: "Guardar disponibilidad" }).click();
  await expect(page.getByRole("status")).toContainText("Cambios guardados");
  await page.goto("/panel?tab=clientes");
  const client = page.locator("aside.panel-card");
  await client.getByLabel("Nombre", { exact: true }).fill("E2E · Cliente habitual");
  await client
    .getByLabel("Notas privadas")
    .fill("Cliente propio de prueba, sin comisión de captación.");
  await client.getByRole("button", { name: "Añadir cliente" }).click();
  await expect(page.locator("summary").filter({ hasText: "E2E · Cliente habitual" })).toBeVisible();
  await page.goto("/panel?tab=agenda");
  const manual = page.locator("#nueva-cita");
  await manual.getByLabel("Cliente propio").selectOption({ label: "E2E · Cliente habitual" });
  await manual
    .getByRole("combobox", { name: "Servicio", exact: true })
    .selectOption({ label: "E2E · Revisión preventiva · 60 min" });
  await manual.getByLabel("Fecha · hora de Madrid").fill(workingDay());
  await manual
    .getByRole("button", { name: /^\d{2}:\d{2}$/ })
    .first()
    .click();
  await manual
    .getByLabel("Notas privadas de la visita")
    .fill("Cita de prueba añadida desde la interfaz.");
  await manual.getByRole("button", { name: "Añadir cita a la agenda" }).click();
  await expect(manual.getByRole("status")).toContainText("captación es 0 %");
  const response = await page.request.get("/api/workspace"),
    data = await response.json();
  const booking = data.bookings.find(
    (b: { notes: string }) => b.notes === "Cita de prueba añadida desde la interfaz.",
  );
  expect(booking.source).toBe("own");
  expect(booking.commission_bps).toBe(0);
  await page.setViewportSize({ width: 390, height: 844 });
  await noOverflow(page);
  await capture(page, "pro-agenda-mobile.png");
});

test("registro, sesión revocada, CSRF, acceso privado y validación de archivos", async ({
  browser,
}) => {
  const client = await browser.newContext({ baseURL: "http://localhost:3100" }),
    stranger = await browser.newContext({ baseURL: "http://localhost:3100" });
  const page = await client.newPage();
  await login(page, "Cliente");
  const workspace = await (await client.request.get("/api/workspace")).json();
  const rid = workspace.requests[0].id;
  expect((await stranger.request.get(`/api/requests/${rid}`)).status()).toBe(401);
  await stranger.request.post("/api/auth", {
    headers: { Origin: "http://localhost:3100" },
    data: {
      action: "register",
      name: "Otro cliente E2E",
      email: `e2e-${Date.now()}@example.test`,
      password: "OtraClave!2026",
      role: "client",
    },
  });
  expect((await stranger.request.get(`/api/requests/${rid}`)).status()).toBe(403);
  const detail = await (await client.request.get(`/api/requests/${rid}`)).json();
  if (detail.attachments.length)
    expect(
      (await stranger.request.get(`/api/attachments/${detail.attachments[0].id}`)).status(),
    ).toBe(403);
  const csrf = await client.request.post("/api/action", {
    headers: { Origin: "https://evil.example" },
    data: { action: "notifications.read", data: {} },
  });
  expect(csrf.status()).toBe(403);
  const invalid = await post(client, "request.create", {
    professionalId: "x",
    title: "x",
    description: "x",
    mode: "onsite",
  });
  expect(invalid.status()).toBe(400);
  const svg = await client.request.post("/api/attachments", {
    headers: { Origin: "http://localhost:3100" },
    multipart: {
      requestId: rid,
      file: {
        name: "fake.png",
        mimeType: "image/png",
        buffer: Buffer.from(
          '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10"/></svg>',
        ),
      },
    },
  });
  expect(svg.status()).toBe(400);
  const malformed = await client.request.post("/api/attachments", {
    headers: { Origin: "http://localhost:3100" },
    multipart: {
      requestId: rid,
      file: {
        name: "fake.jpg",
        mimeType: "image/jpeg",
        buffer: Buffer.from("esto no es una imagen"),
      },
    },
  });
  expect(malformed.status()).toBe(400);
  const cookie = await client.cookies();
  const old = await browser.newContext({ baseURL: "http://localhost:3100" });
  await old.addCookies(cookie);
  await client.request.post("/api/auth", {
    headers: { Origin: "http://localhost:3100" },
    data: { action: "logout" },
  });
  expect((await old.request.get("/api/workspace")).status()).toBe(401);
  await client.close();
  await stranger.close();
  await old.close();
});

test("finalización y anotación de cobro de una cita pasada preparada como fixture", async ({
  page,
}) => {
  await login(page, "Profesional");
  const ws = await (await page.request.get("/api/workspace")).json();
  const b = ws.bookings.find(
    (v: { source: string; status: string }) => v.source === "own" && v.status === "confirmed",
  );
  expect(b).toBeTruthy();
  // Test-only clock fixture: move an isolated demo appointment into the past.
  const db = new DatabaseSync(process.env.DATABASE_PATH!);
  const now = Date.now();
  db.prepare("UPDATE bookings SET starts_at=?,ends_at=?,busy_until=? WHERE id=?").run(
    now - 2 * 3600000,
    now - 3600000,
    now - 30 * 60000,
    b.id,
  );
  db.close();
  await page.goto("/panel?tab=agenda");
  await page.getByText(/Ver todas las citas activas/).click();
  const row = page.locator(".all-bookings .booking-item").filter({ hasText: b.title }).first();
  await row.getByText("Gestionar esta cita", { exact: true }).click();
  await row
    .getByLabel("Trabajo realizado")
    .fill("Revisión completada y comprobación de estanqueidad de demostración.");
  await row.getByRole("button", { name: "Finalizar trabajo", exact: true }).click();
  await page.goto("/panel?tab=historial");
  const completed = page.locator(".booking-item").filter({ hasText: "Finalizado" }).first();
  await expect(completed).toBeVisible();
  await completed.getByLabel("Estado administrativo del cobro").selectOption("recorded");
  await completed.getByRole("button", { name: "Anotar estado" }).click();
  await expect(completed.getByRole("status")).toContainText("Cambios guardados");
});

test("registro profesional desde la interfaz y publicación del primer servicio y horario", async ({
  page,
}) => {
  await page.goto("/acceso?modo=registro&rol=pro");
  await page.getByLabel("Tu nombre").fill("Profesional nuevo de prueba");
  await page.getByLabel("Correo electrónico").fill(`pro-${Date.now()}@example.test`);
  await page.getByLabel("Contraseña", { exact: true }).fill("RegistroSeguro!2026");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Crear mi cuenta" }).click();
  await expect(page).toHaveURL(/\/panel/);
  await page.goto("/panel?tab=perfil");
  await page.getByLabel("Nombre comercial").fill("Fontanería E2E nueva");
  await page
    .getByLabel("Cuéntales cómo trabajas")
    .fill("Perfil de prueba para verificar el alta y la edición completa del profesional.");
  await page.getByRole("button", { name: "Guardar mi perfil" }).click();
  await expect(page.getByRole("status")).toContainText("Cambios guardados");
  await page.getByText("Añadir un trabajo anterior", { exact: true }).click();
  await page.getByLabel("Título del trabajo").fill("Trabajo de ejemplo para E2E");
  await page
    .getByLabel("Qué realizaste")
    .fill("Descripción de prueba de un trabajo anterior sin datos personales.");
  await page.getByRole("button", { name: "Publicar trabajo" }).click();
  await expect(
    page.locator("summary").filter({ hasText: "Trabajo de ejemplo para E2E" }),
  ).toBeVisible();
  await page.goto("/panel?tab=servicios");
  const service = page.locator("aside.panel-card");
  await service.getByLabel("Nombre del servicio").fill("Mi primera visita de diagnóstico");
  await service.getByLabel("Importe total (€)").fill("39");
  await service.getByRole("button", { name: "Crear servicio" }).click();
  await expect(
    page.locator("summary").filter({ hasText: "Mi primera visita de diagnóstico" }),
  ).toBeVisible();
  await page.goto("/panel?tab=disponibilidad");
  await page.getByRole("button", { name: "Añadir turno Lunes", exact: true }).click();
  await page.getByLabel("Inicio Lunes turno 1", { exact: true }).fill("09:00");
  await page.getByLabel("Fin Lunes turno 1", { exact: true }).fill("14:00");
  await page.getByRole("button", { name: "Guardar disponibilidad" }).click();
  await expect(page.getByRole("status")).toContainText("Cambios guardados");
  await page.getByRole("link", { name: "Ver mi perfil público" }).click();
  await expect(
    page.getByRole("heading", { name: "Fontanería E2E nueva", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Mi primera visita de diagnóstico" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Trabajo de ejemplo para E2E" })).toBeVisible();
});
