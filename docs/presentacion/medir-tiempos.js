// Mide el tiempo de armar el dashboard: con Facade (1 petición) vs sin Facade (5 peticiones).
// Uso: node medir-tiempos.js resultados.json   (con el sistema encendido; mejor tras sembrar con seed-20000.js)
const fs = require("fs");
const BASE = "http://localhost:3000/api";
const N = 100;
const WARMUP = 15;
let token = "";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const get = async (path, rtt) => {
  if (rtt) await sleep(rtt); // simula ida y vuelta navegador <-> gateway por petición
  const r = await fetch(BASE + path, { headers: { authorization: `Bearer ${token}` } });
  if (!r.ok) throw new Error(path + " " + r.status);
  return r.json();
};

const modes = {
  // 1 petición; el gateway hace el fan-out por la red interna
  conFacade: (rtt) => get("/dashboard/stats", rtt),
  // 5 peticiones simultáneas (lo mejor que puede hacer el navegador sin Facade)
  sinFacadeParalelo: (rtt) =>
    Promise.all([get("/rooms", rtt), get("/inventory", rtt), get("/inventory/top-consumed?limit=5", rtt), get("/clients", rtt), get("/reservations", rtt)]),
  // 5 peticiones una tras otra (código ingenuo con await en serie)
  sinFacadeSerie: async (rtt) => {
    await get("/rooms", rtt);
    await get("/inventory", rtt);
    await get("/inventory/top-consumed?limit=5", rtt);
    await get("/clients", rtt);
    await get("/reservations", rtt);
  }
};

const stats = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  const q = (p) => s[Math.min(s.length - 1, Math.floor(p * s.length))];
  return { media: +(xs.reduce((a, b) => a + b, 0) / xs.length).toFixed(1), mediana: +q(0.5).toFixed(1), p95: +q(0.95).toFixed(1), min: +s[0].toFixed(1), max: +s[s.length - 1].toFixed(1) };
};

async function run(rtt) {
  const samples = Object.fromEntries(Object.keys(modes).map((k) => [k, []]));
  for (let i = 0; i < WARMUP + N; i++) {
    // se intercala el orden para que ningún modo se beneficie de caché/calentamiento
    for (const name of Object.keys(modes)) {
      const t = performance.now();
      await modes[name](rtt);
      const ms = performance.now() - t;
      if (i >= WARMUP) samples[name].push(ms);
    }
  }
  return Object.fromEntries(Object.entries(samples).map(([k, v]) => [k, stats(v)]));
}

(async () => {
  const r = await fetch(BASE + "/auth/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ username: "admin", password: "admin123" }) });
  token = (await r.json()).token;

  const result = { n: N, localhost: await run(0), latencia50ms: await run(50) };
  console.log(JSON.stringify(result, null, 2));
  fs.writeFileSync(process.argv[2], JSON.stringify(result, null, 2));
})();
