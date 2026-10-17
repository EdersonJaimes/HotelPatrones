// Siembra datos de ejemplo y recorre el flujo de estancia punta a punta contra el gateway.
const BASE = "http://localhost:3000/api";
let token = "";

async function call(method, path, body, expectOk = true) {
  const r = await fetch(BASE + path, {
    method,
    headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await r.json().catch(() => ({}));
  if (expectOk && !r.ok) throw new Error(`${method} ${path} -> ${r.status} ${JSON.stringify(data)}`);
  return { status: r.status, data };
}

(async () => {
  // Esperar al gateway + auth
  for (let i = 0; i < 40; i++) {
    try {
      const r = await fetch(BASE + "/auth/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ username: "admin", password: "admin123" }) });
      if (r.ok) { token = (await r.json()).token; break; }
    } catch {}
    await new Promise((r) => setTimeout(r, 1500));
  }
  if (!token) throw new Error("no se pudo hacer login");
  console.log("login admin OK");

  const types = ["individual", "doble", "triple", "suite"];
  const rooms = [];
  for (let n = 0; n < 8; n++) {
    const { data } = await call("POST", `/rooms/prototypes/${types[n % 4]}`, { number: 101 + n });
    rooms.push(data);
  }
  console.log("habitaciones:", rooms.length);

  const prods = [];
  const catalog = [["Agua 600ml", 2500, "Bebida"], ["Gaseosa", 3500, "Bebida"], ["Papas", 3000, "Snack"], ["Chocolatina", 2000, "Snack"], ["Jabón", 4000, "Aseo"], ["Toalla extra", 8000, "General"]];
  for (const [name, price, category] of catalog) {
    const { data } = await call("POST", "/products", { name, price, category });
    prods.push(data);
  }
  // Stock: casi todos con bastante; "Jabón" con poco, para que el dashboard muestre bajo stock
  const stock = [40, 30, 25, 20, 3, 15];
  for (let i = 0; i < prods.length; i++) await call("POST", "/inventory/add", { productId: prods[i]._id, quantity: stock[i], reason: "Stock inicial" });
  console.log("productos + stock:", prods.length);

  for (let i = 0; i < 12; i++) await call("POST", "/clients", { name: `Cliente ${i + 1}`, document: String(10000000 + i), phone: String(3000000000 + i) });
  console.log("clientes: 12");

  // --- Flujo de estancia (prueba real de stays-service) ---
  const room = rooms[1];
  let r = await call("POST", "/stays/start", { roomId: room._id });
  const stay = r.data;
  console.log("start ->", r.status, "tarifa/hora:", stay.hourlyRate);
  const again = await call("POST", "/stays/start", { roomId: room._id }, false);
  console.log("start repetido (debe fallar) ->", again.status, again.data.message);
  const st = (await call("GET", `/rooms/${room._id}`)).data.status;
  console.log("estado habitación tras start:", st);
  r = await call("POST", "/stays/add-product", { stayId: stay._id, productId: prods[0]._id, quantity: 2 });
  console.log("add-product ->", r.status, "líneas:", r.data.products.length);
  const over = await call("POST", "/stays/add-product", { stayId: stay._id, productId: prods[4]._id, quantity: 99 }, false);
  console.log("add-product sin stock (debe fallar) ->", over.status, over.data.message);
  const act = await call("GET", `/stays/active/${room._id}`);
  console.log("active ->", act.status, "productos:", act.data.products.map((p) => `${p.product.name} x${p.quantity}`).join(", "));
  r = await call("POST", "/stays/checkout", { stayId: stay._id });
  console.log("checkout ->", r.status, JSON.stringify(r.data));
  const dup = await call("POST", "/stays/checkout", { stayId: stay._id }, false);
  console.log("checkout repetido (debe fallar) ->", dup.status, dup.data.message);
  console.log("estado habitación tras checkout:", (await call("GET", `/rooms/${room._id}`)).data.status);

  // Dejar una habitación ocupada para que el dashboard muestre datos
  await call("POST", "/stays/start", { roomId: rooms[0]._id });
  await call("POST", "/stays/start", { roomId: rooms[2]._id });
  await call("POST", "/stays/add-product", { stayId: (await call("GET", `/stays/active/${rooms[0]._id}`)).data._id, productId: prods[1]._id, quantity: 4 });

  console.log("dashboard ->", JSON.stringify((await call("GET", "/dashboard/stats")).data));
})().catch((e) => { console.error("ERROR:", e.message); process.exit(1); });
