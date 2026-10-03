import { Client, IClient } from "../models/client.model";

export interface CreateClientData {
  name: string;
  document: string;
  phone: string;
}

export interface UpdateClientData {
  name?: string;
  document?: string;
  phone?: string;
}

export class ClientRepository {
  async findAll(): Promise<IClient[]> {
    return Client.find().sort({ name: 1 });
  }

  async findById(id: string): Promise<IClient | null> {
    return Client.findById(id);
  }

  async findByDocument(document: string): Promise<IClient | null> {
    return Client.findOne({ document });
  }

  async create(data: CreateClientData): Promise<IClient> {
    return Client.create(data);
  }

  async update(id: string, data: UpdateClientData): Promise<IClient | null> {
    return Client.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  }

  async deleteById(id: string): Promise<IClient | null> {
    return Client.findByIdAndDelete(id);
  }
}
