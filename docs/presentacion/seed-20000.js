// Siembra ~20 000 registros en los microservicios (a través del api-gateway) para ver cómo cambian los
// tiempos en ms con volumen real, con y sin Facade.
//
//   docker compose up -d                       (todo el sistema encendido)
//   node docs/presentacion/seed-20000.js       (≈ 20 028 registros)
//
// Por defecto:  8 000 clientes · 1 200 productos · 6 000 movimientos de kardex · 4 500 reservas
//               120 habitaciones · ~200 estancias de mostrador · 6 usuarios de recepción
//
// Opciones:  --clients=8000 --products=1200 --moves=6000 --reservations=4500 --floors=10
//            --stays=200 --concurrency=16 --base=http://localhost:3000/api --skip=clientes,productos,...
// Se puede repetir: lo que ya existe (409) se salta. Los movimientos de kardex se agregan solo si los
// productos se crearon en esta corrida, para no duplicarlos.
const gen = require("./generadores");

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v ?? "true"];
  })
);
const BASE = args.base || "http://localhost:3000/api";
const N = {
  clients: Number(args.clients ?? 8000),
  products: Number(args.products ?? 1200),
  moves: Number(args.moves ?? 6000),
  reservations: Number(args.reservations ?? 4500),
  floors: Number(args.floors ?? 10),
  stays: Number(args.stays ?? 200),
};
const CONCURRENCY = Number(args.concurrency ?? 16);
const SKIP = new Set((args.skip || "").split(",").filter(Boolean));
const USER = process.env.ADMIN_USERNAME || "admin";
const PASS = process.env.ADMIN_PASSWORD || "admin123";

let token = "";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const t0 = Date.now();
const stamp = () => `[${((Date.now() - t0) / 1000).toFixed(0).padStart(4)} s]`;
const counters = {};
const bump = (k) => (counters[k] = (counters[k] ?? 0) + 1);

async function call(method, path, body) {
  for (let attempt = 0; ; attempt++) {
    try {
      const r = await fetch(BASE + path, {
        method,
        headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await r.json().catch(() => ({}));
      if (r.status >= 500 && attempt < 2) {
        await sleep(300 * (attempt + 1));
        continue;
      }
      return { ok: r.ok, status: r.status, data };
    } catch (e) {
      if (attempt >= 3) throw e;
      await sleep(500 * (attempt + 1));
    }
  }
}

// Ejecuta `worker` sobre cada elemento con N tareas a la vez y avisa cada ~10 %.
async function pool(label, items, worker, concurrency = CONCURRENCY) {
  let next = 0;
  let done = 0;
  const step = Math.max(1, Math.floor(items.length / 10));
  async function run() {
    while (next < items.length) {
      const i = next++;
      await worker(items[i], i);
      done++;
      if (done % step === 0 || done === items.length) {
        console.log(`${stamp()} ${label}: ${done}/${items.length}`);
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, run));
}

const skip = (name) => SKIP.has(name);

// Los check-in/out de las reservas llegan a rooms-service por RabbitMQ, de forma asíncrona: se espera a que
// el estado de las habitaciones deje de cambiar antes de normalizarlas.
async function settleRooms(maxSeconds = 90) {
  let last = "";
  let stable = 0;
  for (let i = 0; i < maxSeconds / 2 && stable < 3; i++) {
    const rooms = (await call("GET", "/rooms")).data;
    const signature = rooms.map((r) => r.status[0]).join("");
    stable = signature === last ? stable + 1 : 0;
    last = signature;
    await sleep(2000);
  }
}

(async () => {
  console.log(`Sembrando en ${BASE}  (concurrencia ${CONCURRENCY})`);

  // --- sesión ---
  for (let i = 0; i < 40 && !token; i++) {
    try {
      const r = await call("POST", "/auth/login", { username: USER, password: PASS });
      if (r.ok) token = r.data.token;
    } catch {
      /* el gateway aún no responde */
    }
    if (!token) await sleep(1500);
  }
  if (!token) throw new Error("No se pudo iniciar sesión: ¿está encendido el sistema y son correctas las credenciales?");
  console.log(`${stamp()} sesión de ${USER} iniciada`);

  // --- habitaciones (Prototype) ---
  const rooms = gen.makeRooms(N.floors);
  if (!skip("habitaciones")) {
    await pool("habitaciones", rooms, async (r) => {
      const res = await call("POST", `/rooms/prototypes/${r.type}`, { number: r.number, price: r.price });
      if (res.ok) bump("habitaciones creadas");
      else if (res.status !== 409) console.warn(`  habitación ${r.number}: ${res.status} ${res.data.message}`);
    });
  }

  // --- clientes ---
  const clients = gen.makeClients(N.clients);
  if (!skip("clientes")) {
    await pool("clientes", clients, async (c) => {
      const res = await call("POST", "/clients", c);
      if (res.ok) bump("clientes creados");
      else if (res.status !== 409) console.warn(`  cliente ${c.document}: ${res.status} ${res.data.message}`);
    });
  }

  // --- productos ---
  const products = gen.makeProducts(N.products);
  let createdProducts = 0;
  if (!skip("productos")) {
    await pool("productos", products, async (p) => {
      const res = await call("POST", "/products", p);
      if (res.ok) {
        createdProducts++;
        bump("productos creados");
      } else if (res.status !== 409) console.warn(`  producto ${p.name}: ${res.status} ${res.data.message}`);
    });
  }
  const productId = new Map();
  for (const p of (await call("GET", "/products")).data) productId.set(p.name.toLowerCase(), p._id);

  // --- kardex: stock inicial y movimientos, en orden por producto ---
  if (!skip("movimientos") && N.moves > 0 && createdProducts > 0) {
    const { initial, extra } = gen.makeMovements(products, N.moves);
    const byProduct = new Map();
    [...initial, ...extra].forEach((m) => byProduct.set(m.productIndex, [...(byProduct.get(m.productIndex) ?? []), m]));
    await pool(
      "kardex (por producto)",
      [...byProduct.entries()],
      async ([index, list]) => {
        const id = productId.get(products[index].name.toLowerCase());
        if (!id) return;
        for (const m of list) {
          const res = await call("POST", m.type === "IN" ? "/inventory/add" : "/inventory/remove", { productId: id, quantity: m.quantity, reason: m.reason });
          if (res.ok) bump("movimientos");
          else console.warn(`  movimiento ${products[index].name}: ${res.status} ${res.data.message}`);
        }
      }
    );
  } else if (!skip("movimientos")) {
    console.log(`${stamp()} kardex: se omite (los productos ya existían; usa un volumen limpio para sembrarlos otra vez)`);
  }

  // --- reservas ---
  const roomId = new Map((await call("GET", "/rooms")).data.map((r) => [r.number, r._id]));
  if (!skip("reservas") && N.reservations > 0) {
    // reservations-service recibe las habitaciones por eventos de RabbitMQ: se da un momento para que lleguen.
    await sleep(2500);
    const start = new Date(Date.now() - 90 * 86400000);
    const reservations = gen.makeReservations(rooms, clients, N.reservations, start);
    const now = Date.now();
    await pool("reservas", reservations, async (r) => {
      const id = roomId.get(r.roomNumber);
      if (!id) return;
      let res;
      for (let i = 0; i < 6; i++) {
        res = await call("POST", "/reservations", {
          roomId: id, clientName: r.clientName, clientDocument: r.clientDocument, clientPhone: r.clientPhone,
          checkIn: r.checkIn, checkOut: r.checkOut, guests: r.guests, channel: r.channel, notes: r.notes,
        });
        if (res.ok || res.data.message !== "Habitación no encontrada") break;
        await sleep(1000);
      }
      if (!res.ok) {
        bump("reservas rechazadas");
        return;
      }
      bump("reservas creadas");
      const rid = res.data._id;
      const past = new Date(r.checkOut).getTime() < now;
      const current = !past && new Date(r.checkIn).getTime() <= now;
      const steps =
        past ? (r.roll < 0.88 ? ["confirm", "check-in", "check-out"] : ["cancel"])
        : current ? ["confirm", "check-in"]
        : r.roll < 0.55 ? [] : r.roll < 0.9 ? ["confirm"] : ["cancel"];
      for (const s of steps) await call("PATCH", `/reservations/${rid}/${s}`);
    });
  }

  // --- estado real de las habitaciones: estancias de mostrador, aseo y mantenimiento ---
  if (!skip("estancias")) {
    console.log(`${stamp()} habitaciones: dejando todas disponibles (los check-in/out de las reservas movieron su estado)…`);
    await settleRooms(); // que terminen de llegar los eventos reservation.checked_in/out
    const allRooms = (await call("GET", "/rooms")).data.sort((a, b) => a.number - b.number);
    await pool("habitaciones disponibles", allRooms.filter((r) => r.status !== "available"), (r) => call("PATCH", `/rooms/${r._id}/status`, { status: "available" }));

    const stock = new Map((await call("GET", "/products")).data.map((p) => [p._id, p.stock]));
    const inStock = [...stock.entries()].filter(([, s]) => s >= 8).map(([id]) => id);
    const addConsumption = async (stayId, how) => {
      for (let k = 0; k < how; k++) {
        const id = inStock[Math.floor(Math.random() * inStock.length)];
        if (id) await call("POST", "/stays/add-product", { stayId, productId: id, quantity: 1 + Math.floor(Math.random() * 2) });
      }
    };

    const closedCount = Math.min(N.stays, 400);
    const cycle = Array.from({ length: closedCount }, (_, i) => allRooms[i % allRooms.length]);
    // estancias ya cerradas: se agrupan por habitación para no cruzar start/checkout de la misma
    const byRoom = new Map();
    cycle.forEach((r) => byRoom.set(r._id, (byRoom.get(r._id) ?? 0) + 1));
    await pool("estancias cerradas", [...byRoom.entries()], async ([id, times]) => {
      for (let t = 0; t < times; t++) {
        const s = await call("POST", "/stays/start", { roomId: id });
        if (!s.ok) break;
        await addConsumption(s.data._id, Math.floor(Math.random() * 4));
        const c = await call("POST", "/stays/checkout", { stayId: s.data._id });
        if (c.ok) bump("estancias cerradas");
        await call("PATCH", `/rooms/${id}/status`, { status: "available" });
      }
    });

    // el estado final del hotel: ~25 % ocupado, algunas en aseo y unas pocas en mantenimiento
    const shuffled = [...allRooms].sort(() => Math.random() - 0.5);
    const occupy = shuffled.slice(0, Math.round(allRooms.length * 0.25));
    const cleaning = shuffled.slice(occupy.length, occupy.length + Math.round(allRooms.length * 0.08));
    const maintenance = shuffled.slice(occupy.length + cleaning.length, occupy.length + cleaning.length + Math.max(2, Math.round(allRooms.length * 0.05)));
    await pool("estancias abiertas", occupy, async (r) => {
      const s = await call("POST", "/stays/start", { roomId: r._id });
      if (s.ok) {
        bump("estancias abiertas");
        if (Math.random() < 0.6) await addConsumption(s.data._id, 1 + Math.floor(Math.random() * 3));
      }
    });
    await pool("habitaciones en aseo", cleaning, (r) => call("PATCH", `/rooms/${r._id}/status`, { status: "cleaning" }));
    await pool("habitaciones en mantenimiento", maintenance, (r) => call("PATCH", `/rooms/${r._id}/status`, { status: "maintenance" }));
  }

  // --- usuarios de recepción ---
  if (!skip("usuarios")) {
    const team = [["Paula Ruiz", "pruiz"], ["Carlos Mora", "cmora"], ["Daniela Peña", "dpena"], ["Felipe Ortega", "fortega"], ["Mariana Ríos", "mrios"], ["Santiago León", "sleon"]];
    for (const [name, username] of team) {
      const r = await call("POST", "/auth/users", { name, username, password: "hotel123", role: "recepcionista" });
      if (r.ok) bump("usuarios creados");
    }
  }

  // --- resumen ---
  const size = async (path) => (await call("GET", path)).data.length;
  const totals = {
    clientes: await size("/clients"),
    productos: await size("/products"),
    habitaciones: await size("/rooms"),
    reservas: await size("/reservations"),
    "estancias (abiertas + cerradas)": await size("/stays"),
    "movimientos de kardex (últimos 500)": await size("/inventory/movements?limit=500"),
  };
  console.log("\n=== Resumen ===");
  console.log("creado en esta corrida:", counters);
  console.log("total en el sistema:", totals);
  console.log(`tiempo: ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  console.log("\nAhora abre el Panel (http://localhost:5173) y usa el laboratorio Facade / sin Facade,");
  console.log("o mide desde la terminal:  node docs/presentacion/medir-tiempos.js docs/presentacion/resultados-20000.json");
})().catch((e) => {
  console.error("\nError:", e.message);
  process.exit(1);
});
