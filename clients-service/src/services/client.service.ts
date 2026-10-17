import {
  publishClientCreated,
  publishClientDeleted,
  publishClientUpdated
} from "../broker/client.publisher";
import { ClientRepository } from "../repositories/client.repository";
import { IClient } from "../models/client.model";

const DUPLICATE_DOCUMENT = "Ya existe un cliente con ese documento";
const NOT_FOUND = "Cliente no encontrado";

function toEventData(client: IClient) {
  return {
    clientId: client._id.toString(),
    name: client.name,
    document: client.document,
    phone: client.phone
  };
}

// Código 11000 = violación del índice único (carrera entre dos altas simultáneas).
function isDuplicateKeyError(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { code?: number }).code === 11000;
}

export class ClientService {
  private readonly clientRepository = new ClientRepository();

  async countClients() {
    return { count: await this.clientRepository.count() };
  }

  async listClients() {
    return this.clientRepository.findAll();
  }

  async getClientById(id: string) {
    const client = await this.clientRepository.findById(id);

    if (!client) {
      throw new Error(NOT_FOUND);
    }

    return client;
  }

  async createClient(data: { name: string; document: string; phone: string }) {
    if (await this.clientRepository.findByDocument(data.document)) {
      throw new Error(DUPLICATE_DOCUMENT);
    }

    let client: IClient;

    try {
      client = await this.clientRepository.create(data);
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        throw new Error(DUPLICATE_DOCUMENT);
      }
      throw error;
    }

    await publishClientCreated(toEventData(client));

    return client;
  }

  async updateClient(id: string, data: { name?: string; document?: string; phone?: string }) {
    const current = await this.clientRepository.findById(id);

    if (!current) {
      throw new Error(NOT_FOUND);
    }

    if (data.document !== undefined) {
      const sameDocument = await this.clientRepository.findByDocument(data.document);

      if (sameDocument && sameDocument._id.toString() !== id) {
        throw new Error(DUPLICATE_DOCUMENT);
      }
    }

    let client: IClient | null;

    try {
      client = await this.clientRepository.update(id, data);
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        throw new Error(DUPLICATE_DOCUMENT);
      }
      throw error;
    }

    if (!client) {
      throw new Error(NOT_FOUND);
    }

    await publishClientUpdated(toEventData(client));

    return client;
  }

  async deleteClient(id: string) {
    const client = await this.clientRepository.deleteById(id);

    if (!client) {
      throw new Error(NOT_FOUND);
    }

    await publishClientDeleted({ clientId: client._id.toString(), name: client.name });

    return client;
  }
}
