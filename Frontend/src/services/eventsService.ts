import api from "./api";

export interface BrokerEvent {
  id: number;
  routingKey: string;
  event: string;
  timestamp: string;
  receivedAt: string;
  data: unknown;
}

export interface DemoStep {
  name: string;
  ms: number;
}

export interface DemoResult {
  mode: "facade" | "directo";
  steps: DemoStep[];
  totalMs: number;
}

// Eventos que el gateway escucha en RabbitMQ (los publican los microservicios con su BrokerFacade).
export async function getEvents(after = 0): Promise<{ connected: boolean; events: BrokerEvent[] }> {
  return (await api.get("/events", { params: { after } })).data;
}

// Publica un evento de demostración con o sin la fachada del broker y devuelve los pasos medidos.
export async function publishDemo(mode: "facade" | "directo"): Promise<DemoResult> {
  return (await api.post("/events/demo", null, { params: { mode } })).data;
}

// Evento real: clients-service publica client.created al crear y client.deleted al borrar,
// los dos a través de su BrokerFacade. El cliente de prueba se elimina enseguida.
export async function createAndDeleteTestClient(): Promise<void> {
  const document = String(Date.now()).slice(-11);
  const created = (await api.post("/clients", { name: "Cliente de prueba (broker)", document, phone: "3001234567" })).data;
  await api.delete(`/clients/${created._id}`);
}
