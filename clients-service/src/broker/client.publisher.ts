import { broker } from "./broker.facade";

interface ClientEventData {
  clientId: string;
  name: string;
  document: string;
  phone: string;
}

export async function publishClientCreated(data: ClientEventData): Promise<void> {
  broker.publish("client.created", "CLIENT_CREATED", data);
}

export async function publishClientUpdated(data: ClientEventData): Promise<void> {
  broker.publish("client.updated", "CLIENT_UPDATED", data);
}

export async function publishClientDeleted(data: { clientId: string; name: string }): Promise<void> {
  broker.publish("client.deleted", "CLIENT_DELETED", data);
}
