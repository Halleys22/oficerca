import bcrypt from "bcryptjs";
import { all, database, id, one, run, transaction } from "../lib/db";
import { addDays, madridDate, wallInstant } from "../lib/availability";
import { performAction } from "../lib/actions";
import type { User } from "../lib/types";

export const DEMO_PASSWORD = "OficercaDemo!2026";
export async function seed() {
  database();
  if (one("SELECT id FROM users WHERE email='cliente@oficerca.test'")) {
    console.log("Datos demo existentes; no se modifican.");
    return;
  }
  if (process.env.NODE_ENV === "production")
    throw new Error("Los datos de demostración no se generan en producción.");
  const hash = await bcrypt.hash(DEMO_PASSWORD, 12);
  transaction(() => {
    const now = Date.now();
    const users = [
      { id: id(), name: "Lucía Martín", email: "cliente@oficerca.test", role: "client" },
      { id: id(), name: "Javier Moreno", email: "profesional@oficerca.test", role: "pro" },
      { id: id(), name: "Administración local", email: "admin@oficerca.test", role: "admin" },
      { id: id(), name: "Elena Sánchez", email: "elena@oficerca.test", role: "pro" },
      { id: id(), name: "Roberto Gil", email: "roberto@oficerca.test", role: "pro" },
      { id: id(), name: "María Vega", email: "maria@oficerca.test", role: "pro" },
    ];
    for (const u of users)
      run(
        "INSERT INTO users(id,name,email,password_hash,role,is_demo,created_at) VALUES (?,?,?,?,?,1,?)",
        u.id,
        u.name,
        u.email,
        hash,
        u.role,
        now,
      );
    const profiles = [
      {
        uid: users[1].id,
        slug: "javier-moreno",
        name: "Javier Moreno",
        specialty: "Fugas, grifería y pequeñas reparaciones",
        bio: "Me gusta explicar qué ocurre, qué opciones tienes y cuánto costará antes de empezar. Trabajo con reparaciones domésticas, cambios de grifos y pequeñas fugas en Cáceres.",
        experience: 14,
        remote: 1,
        auto: 0,
        price: 3500,
        start: 540,
        end: 1080,
        zones: ["Cáceres centro", "Mejostilla", "Nuevo Cáceres"],
      },
      {
        uid: users[3].id,
        slug: "elena-sanchez",
        name: "Elena Sánchez",
        specialty: "Baños, sanitarios y ahorro de agua",
        bio: "Especializada en mantener tu baño en buen estado: cisternas, sanitarios y accesorios. Revisamos juntas el problema y te propongo una solución proporcionada, con el presupuesto por escrito.",
        experience: 9,
        remote: 1,
        auto: 1,
        price: 4000,
        start: 480,
        end: 960,
        zones: ["Cáceres", "Aldea Moret", "Malpartida de Cáceres"],
      },
      {
        uid: users[4].id,
        slug: "roberto-gil",
        name: "Roberto Gil",
        specialty: "Desagües y mantenimiento doméstico",
        bio: "Resuelvo atascos domésticos y realizo mantenimiento preventivo de las instalaciones de agua. Te ayudo a entender cuándo basta una reparación y cuándo conviene una visita para valorar el trabajo.",
        experience: 21,
        remote: 0,
        auto: 0,
        price: 3000,
        start: 600,
        end: 1140,
        zones: ["Cáceres", "Sierra de Fuentes"],
      },
      {
        uid: users[5].id,
        slug: "maria-vega",
        name: "María Vega",
        specialty: "Instalaciones y pequeñas reformas",
        bio: "Acompaño a particulares en mejoras de su instalación de agua: nuevas tomas, sustitución de tuberías accesibles y conexiones de electrodomésticos. Cada trabajo empieza con una conversación clara.",
        experience: 7,
        remote: 0,
        auto: 1,
        price: 4500,
        start: 510,
        end: 990,
        zones: ["Cáceres", "Casar de Cáceres"],
      },
    ];
    for (const p of profiles) {
      const pid = id();
      run(
        "INSERT INTO professionals(id,user_id,slug,name,specialty,bio,experience,remote,auto_confirm,is_demo) VALUES (?,?,?,?,?,?,?,?,?,1)",
        pid,
        p.uid,
        p.slug,
        p.name,
        p.specialty,
        p.bio,
        p.experience,
        p.remote,
        p.auto,
      );
      for (const zone of p.zones) run("INSERT INTO coverage_areas VALUES (?,?,?)", id(), pid, zone);
      for (let day = 1; day <= 5; day++)
        run("INSERT INTO availability VALUES (?,?,?,?,?)", id(), pid, day, p.start, p.end);
      const services = [
        {
          name: "Visita de diagnóstico",
          description:
            "Inspección de la instalación para identificar el problema y preparar una propuesta. La visita no incluye la reparación.",
          price: p.price,
          type: "fixed",
          duration: 60,
          mode: "onsite",
        },
        {
          name: p.slug === "roberto-gil" ? "Desatasco doméstico" : "Reparación de grifería",
          description:
            "Precio de mano de obra orientativo. Los materiales y el alcance se acuerdan en el presupuesto antes de reservar.",
          price: p.price + 1500,
          type: "from",
          duration: 90,
          mode: "onsite",
        },
        {
          name: "Reparación por valorar",
          description:
            "Necesita diagnóstico previo. La duración publicada solo se usa para una visita de valoración; la reparación se agenda tras acordar el alcance.",
          price: null,
          type: "diagnosis",
          duration: 60,
          mode: "onsite",
        },
      ];
      if (p.remote)
        services.push({
          name: "Consulta remota orientativa",
          description:
            "Conversación por mensajes y fotografías. Sin videollamada integrada y sin diagnóstico definitivo a distancia.",
          price: 1500,
          type: "fixed",
          duration: 30,
          mode: "remote",
        });
      for (const s of services)
        run(
          "INSERT INTO services VALUES (?,?,?,?,?,?,?,?,?,1)",
          id(),
          pid,
          s.name,
          s.description,
          s.price,
          s.type,
          s.duration,
          s.mode,
          "Describe el problema y envía una fotografía si puedes.",
        );
      run(
        "INSERT INTO portfolio VALUES (?,?,?,?,1)",
        id(),
        pid,
        "Sustitución de grifería doméstica",
        "Ejemplo ficticio de un trabajo anterior: retirada del grifo, colocación del nuevo y comprobación de estanqueidad.",
      );
    }
  });
  const customer = one<User>("SELECT * FROM users WHERE email='cliente@oficerca.test'")!;
  const proUser = one<User>("SELECT * FROM users WHERE email='profesional@oficerca.test'")!;
  const professional = one<{ id: string }>(
    "SELECT id FROM professionals WHERE user_id=?",
    proUser.id,
  )!;
  const rid = performAction(customer, "request.create", {
    professionalId: professional.id,
    title: "El grifo de la cocina no deja de gotear",
    description:
      "Desde hace unos días el grifo gotea incluso cuando lo cierro del todo. Me gustaría saber si se puede reparar o conviene cambiarlo.",
    symptoms: ["Goteo o fuga"],
    mode: "onsite",
  }).id!;
  performAction(proUser, "message.send", {
    requestId: rid,
    body: "Hola, Lucía. Por lo que cuentas conviene revisar el cartucho del grifo. Te envío un presupuesto de visita y revisión; si hacen falta piezas, lo hablamos antes de cambiarlas.",
  });
  const qid = performAction(proUser, "quote.create", {
    requestId: rid,
    notes:
      "Precio total, impuestos incluidos. No incluye recambios; cualquier cambio se presupuestará antes de reservar de nuevo.",
    lines: [{ description: "Visita y revisión de grifería", quantity: 1, unit_cents: 3500 }],
  }).id!;
  performAction(customer, "quote.decide", { quoteId: qid, decision: "accepted" });
  const cid = performAction(proUser, "client.save", {
    name: "Carmen López · demo",
    phone: "",
    email: "",
    notes: "Cliente ficticio aportado por el profesional. Prefiere citas por la mañana.",
  }).id!;
  const service = all<{ id: string; duration: number }>(
    "SELECT id,duration FROM services WHERE professional_id=? AND active=1",
    professional.id,
  )[0];
  let date = addDays(madridDate(), 1);
  while (
    new Date(date + "T12:00:00Z").getUTCDay() === 0 ||
    new Date(date + "T12:00:00Z").getUTCDay() === 6
  )
    date = addDays(date, 1);
  performAction(proUser, "booking.manual", {
    clientId: cid,
    serviceId: service.id,
    startsAt: wallInstant(date, 600),
    notes: "Revisión preventiva · cita ficticia de demostración",
  });
  performAction(customer, "booking.create", {
    requestId: rid,
    serviceId: service.id,
    startsAt: wallInstant(date, 720),
  });
  const rid2 = performAction(customer, "request.create", {
    professionalId: professional.id,
    title: "La cisterna tarda mucho en llenarse",
    description:
      "La cisterna del baño tarda varios minutos en llenarse y hace un ruido constante. Puedo enviar fotografías de la tapa y del mecanismo.",
    symptoms: ["Ruido extraño", "Falta de presión"],
    mode: "onsite",
  }).id!;
  performAction(customer, "message.send", {
    requestId: rid2,
    body: "Hola, ¿necesitas una fotografía del mecanismo interior o del modelo del sanitario?",
  });
  console.log("Datos ficticios cargados. Contraseña local de demostración: " + DEMO_PASSWORD);
}
