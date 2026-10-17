// Generadores de datos de ejemplo para el hotel: clientes, productos, habitaciones, reservas y movimientos.
// Son DETERMINISTAS (misma semilla => mismos datos), así dos corridas dan resultados comparables.
// Los usa seed-20000.js para sembrar los microservicios a través del gateway.

function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = (r, list) => list[Math.floor(r() * list.length)];
const between = (r, a, b) => a + Math.floor(r() * (b - a + 1));

const FIRST = ["Laura", "Andrés", "Diana", "Julián", "Valentina", "Camila", "Mateo", "Sergio", "Natalia", "Jorge", "Paula", "Carlos", "Daniela", "Felipe", "Mariana", "Santiago", "Isabela", "Nicolás", "Juliana", "Sebastián", "Carolina", "David", "Lucía", "Miguel", "Alejandra", "Tomás", "Sofía", "Esteban", "Gabriela", "Ricardo", "Andrea", "Manuel", "Catalina", "Óscar", "Verónica", "Héctor", "Lorena", "Iván", "Marcela", "Pablo", "Adriana", "Camilo", "Natalí", "Rodrigo", "Tatiana", "Fabián", "Mónica", "Alberto", "Ximena", "Emilio"];
const LAST = ["Méndez", "Rojas", "Castillo", "Pardo", "Ortiz", "Herrera", "Silva", "Díaz", "Gómez", "Pineda", "Ramírez", "Torres", "Vargas", "Moreno", "Jiménez", "Cardona", "Salazar", "Ospina", "Restrepo", "Giraldo", "Mejía", "Londoño", "Zapata", "Arango", "Cortés", "Navarro", "Quintero", "Rincón", "Beltrán", "Cruz", "Peña", "Acosta", "Duarte", "Franco", "Guerrero", "Lozano", "Montoya", "Nieto", "Parra", "Suárez"];

// Documento único de 10 dígitos y celular colombiano de 10 dígitos.
function makeClients(count, seed = 11) {
  const r = rng(seed);
  const out = [];
  for (let i = 0; i < count; i++) {
    const second = r() < 0.5 ? ` ${pick(r, LAST)}` : "";
    out.push({
      name: `${pick(r, FIRST)} ${pick(r, LAST)}${second}`,
      document: String(1000000000 + i * 7 + between(r, 0, 6)),
      phone: String(3000000000 + between(r, 0, 249999999)),
    });
  }
  return out;
}

const CATALOG = [
  { base: "Agua", category: "Bebida", price: 3500, variants: ["600 ml", "con gas 600 ml", "1 L", "saborizada limón", "saborizada mora", "botella 330 ml"] },
  { base: "Gaseosa", category: "Bebida", price: 4500, variants: ["cola 400 ml", "cola 1.5 L", "lima limón 400 ml", "naranja 400 ml", "uva 400 ml", "light 400 ml"] },
  { base: "Cerveza", category: "Bebida", price: 6500, variants: ["nacional lata", "nacional botella", "rubia importada", "negra", "artesanal IPA", "sin alcohol"] },
  { base: "Jugo", category: "Bebida", price: 5000, variants: ["naranja", "mango", "mora", "lulo", "maracuyá", "manzana", "piña"] },
  { base: "Vino", category: "Bebida", price: 38000, variants: ["tinto reserva", "blanco seco", "rosado", "espumoso", "tinto media botella"] },
  { base: "Café", category: "Bebida", price: 4000, variants: ["americano", "con leche", "capuchino", "moca", "descafeinado"] },
  { base: "Té", category: "Bebida", price: 3500, variants: ["manzanilla", "verde", "frutos rojos", "chai", "menta"] },
  { base: "Energizante", category: "Bebida", price: 7500, variants: ["250 ml", "500 ml", "sin azúcar"] },
  { base: "Papas fritas", category: "Snack", price: 4000, variants: ["clásicas", "limón", "pollo", "picantes", "familiares", "onduladas"] },
  { base: "Chocolatina", category: "Snack", price: 3000, variants: ["con leche", "amarga", "con almendras", "blanca", "rellena de caramelo"] },
  { base: "Galletas", category: "Snack", price: 3200, variants: ["de sal", "de vainilla", "de chocolate", "integrales", "rellenas de crema"] },
  { base: "Maní", category: "Snack", price: 2800, variants: ["salado", "con pasas", "confitado", "japonés"] },
  { base: "Barra de cereal", category: "Snack", price: 3500, variants: ["avena", "frutos rojos", "chocolate", "coco"] },
  { base: "Chicles", category: "Snack", price: 1800, variants: ["menta", "fresa", "sin azúcar", "frutas"] },
  { base: "Sándwich", category: "Snack", price: 9500, variants: ["jamón y queso", "pollo", "vegetariano", "atún"] },
  { base: "Helado", category: "Snack", price: 6000, variants: ["vainilla", "chocolate", "fresa", "paleta de limón"] },
  { base: "Kit de aseo", category: "Aseo", price: 8000, variants: ["básico", "viaje", "premium", "dental", "afeitado"] },
  { base: "Jabón", category: "Aseo", price: 2500, variants: ["de tocador", "líquido", "antibacterial", "de avena"] },
  { base: "Shampoo", category: "Aseo", price: 3000, variants: ["sachet", "frasco 50 ml", "frasco 250 ml", "anticaspa"] },
  { base: "Crema", category: "Aseo", price: 4500, variants: ["hidratante", "protector solar", "corporal", "para manos"] },
  { base: "Cepillo de dientes", category: "Aseo", price: 3500, variants: ["adulto", "suave", "eléctrico de viaje"] },
  { base: "Papel higiénico", category: "Aseo", price: 2000, variants: ["rollo", "paquete x4", "doble hoja"] },
  { base: "Toalla", category: "General", price: 12000, variants: ["extra", "de manos", "de playa", "de baño grande"] },
  { base: "Almohada", category: "General", price: 25000, variants: ["extra", "ortopédica", "de plumas"] },
  { base: "Cobija", category: "General", price: 30000, variants: ["extra", "térmica", "ligera"] },
  { base: "Cargador", category: "General", price: 18000, variants: ["USB-C", "Lightning", "universal", "inalámbrico"] },
  { base: "Adaptador", category: "General", price: 9000, variants: ["de enchufe", "universal de viaje", "HDMI"] },
  { base: "Sombrilla", category: "General", price: 15000, variants: ["plegable", "grande"] },
  { base: "Plancha", category: "General", price: 6000, variants: ["alquiler por noche", "de viaje"] },
  { base: "Lavandería", category: "General", price: 14000, variants: ["camisa", "pantalón", "vestido", "paquete 5 prendas", "express"] },
];

// Productos con nombre único (el servicio no permite repetidos, sin distinguir mayúsculas).
function makeProducts(count, seed = 22) {
  const r = rng(seed);
  const SUFFIX = ["", " (promo)", " (importado)", " (pack x2)", " (pack x3)", " (edición hotel)", " (mini)", " (maxi)", " (nacional)", " (orgánico)", " (lote 2)", " (lote 3)", " (premium)", " (económico)"];
  const seen = new Set();
  const out = [];
  let round = 0;
  while (out.length < count) {
    for (const item of CATALOG) {
      for (const variant of item.variants) {
        if (out.length >= count) break;
        const suffix = round === 0 ? "" : SUFFIX[round % SUFFIX.length] + (round >= SUFFIX.length ? ` #${Math.floor(round / SUFFIX.length)}` : "");
        const name = `${item.base} ${variant}${suffix}`;
        if (seen.has(name.toLowerCase())) continue;
        seen.add(name.toLowerCase());
        const jitter = 0.85 + r() * 0.5;
        out.push({ name, category: item.category, price: Math.round((item.price * jitter) / 100) * 100 });
      }
    }
    round += 1;
  }
  return out.slice(0, count);
}

// Edificio de `floors` pisos con 12 habitaciones cada uno (101–112, 201–212 …).
function makeRooms(floors = 10, seed = 33) {
  const r = rng(seed);
  const RANGE = { individual: [22000, 32000], doble: [38000, 56000], triple: [58000, 85000], suite: [95000, 190000] };
  const PATTERN = ["individual", "individual", "individual", "doble", "doble", "doble", "doble", "doble", "triple", "triple", "suite", "suite"];
  const out = [];
  for (let f = 1; f <= floors; f++) {
    PATTERN.forEach((type, k) => {
      const [lo, hi] = RANGE[type];
      out.push({ number: f * 100 + k + 1, type, price: Math.round((lo + r() * (hi - lo)) / 500) * 500 });
    });
  }
  return out;
}

const CHANNELS = ["walk_in", "phone", "online", "corporate"];
const NOTES = ["", "", "", "", "Llega tarde, después de las 9 p. m.", "Pide cuna", "Aniversario", "Factura a nombre de la empresa", "Cama adicional", "Late check-out"];

// Reservas sin cruces: cada habitación avanza en el tiempo con huecos de 0 a 3 días.
// `start` es el primer día de la línea de tiempo (por ejemplo, hace 90 días).
function makeReservations(rooms, clients, count, start, seed = 44) {
  const r = rng(seed);
  const cursor = rooms.map(() => start.getTime() + between(r, 0, 4) * 86400000);
  const capacity = { individual: 1, doble: 2, triple: 3, suite: 4 };
  const out = [];
  let i = 0;
  while (out.length < count) {
    const idx = i % rooms.length;
    const room = rooms[idx];
    const nights = between(r, 1, 5);
    const ci = new Date(cursor[idx]);
    ci.setHours(15, 0, 0, 0);
    const co = new Date(ci.getTime() + nights * 86400000);
    co.setHours(12, 0, 0, 0);
    cursor[idx] = co.getTime() + between(r, 0, 3) * 86400000;
    const client = clients[Math.floor(r() * clients.length)];
    out.push({
      roomNumber: room.number,
      clientName: client.name,
      clientDocument: client.document,
      clientPhone: client.phone,
      checkIn: ci.toISOString(),
      checkOut: co.toISOString(),
      guests: between(r, 1, capacity[room.type]),
      channel: pick(r, CHANNELS),
      notes: pick(r, NOTES) || undefined,
      roll: r(), // decide el estado final de la reserva según la fecha
    });
    i += 1;
  }
  return out;
}

const IN_REASONS = ["Compra a proveedor", "Reposición semanal", "Ajuste de inventario", "Devolución de huésped"];
const OUT_REASONS = ["Consumo en habitación", "Consumo en habitación", "Consumo en habitación", "Producto dañado", "Ajuste de inventario", "Cortesía"];

// Stock inicial y movimientos posteriores sin dejar nunca el stock en negativo.
function makeMovements(products, count, seed = 55) {
  const r = rng(seed);
  const stock = products.map(() => {
    const roll = r();
    if (roll < 0.04) return 0; // agotados
    if (roll < 0.12) return between(r, 1, 5); // por reponer
    return between(r, 8, 140);
  });
  const level = [...stock];
  const initial = products
    .map((p, i) => ({ productIndex: i, type: "IN", quantity: stock[i], reason: "Stock inicial" }))
    .filter((m) => m.quantity > 0);

  // Algunos productos se consumen mucho más que otros (para que "lo más vendido" tenga sentido).
  const popular = products.map(() => (r() < 0.12 ? 8 : 1));
  const weights = popular.reduce((acc, w, i) => (acc.push((acc[i - 1] ?? 0) + w), acc), []);
  const total = weights[weights.length - 1];
  const draw = () => {
    const x = r() * total;
    let lo = 0;
    let hi = weights.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (weights[mid] < x) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  };

  const extra = [];
  while (initial.length + extra.length < count) {
    const i = draw();
    if (r() < 0.62 && level[i] > 0) {
      const q = Math.min(level[i], between(r, 1, 6));
      level[i] -= q;
      extra.push({ productIndex: i, type: "OUT", quantity: q, reason: pick(r, OUT_REASONS) });
    } else {
      const q = between(r, 5, 40);
      level[i] += q;
      extra.push({ productIndex: i, type: "IN", quantity: q, reason: pick(r, IN_REASONS) });
    }
  }
  return { initial, extra };
}

module.exports = { rng, makeClients, makeProducts, makeRooms, makeReservations, makeMovements, CHANNELS };
