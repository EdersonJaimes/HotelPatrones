import { Request, Response } from "express";
import { ClientService } from "../services/client.service";
import { sendError } from "./error.mapper";

export class ClientController {
  private readonly clientService = new ClientService();

  list = async (_req: Request, res: Response): Promise<void> => {
    try {
      res.status(200).json(await this.clientService.listClients());
    } catch (error) {
      sendError(res, error, "Error obteniendo clientes");
    }
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    try {
      res.status(200).json(await this.clientService.getClientById(req.params.id as string));
    } catch (error) {
      sendError(res, error, "Error obteniendo el cliente");
    }
  };

  create = async (req: Request, res: Response): Promise<void> => {
    try {
      const { name, document, phone } = req.body;
      const client = await this.clientService.createClient({ name, document, phone });
      res.status(201).json(client);
    } catch (error) {
      sendError(res, error, "Error creando el cliente");
    }
  };

  update = async (req: Request, res: Response): Promise<void> => {
    try {
      const { name, document, phone } = req.body;

      const changes = Object.fromEntries(
        Object.entries({ name, document, phone }).filter(([, value]) => value !== undefined)
      );

      const client = await this.clientService.updateClient(req.params.id as string, changes);
      res.status(200).json(client);
    } catch (error) {
      sendError(res, error, "Error actualizando el cliente");
    }
  };

  remove = async (req: Request, res: Response): Promise<void> => {
    try {
      await this.clientService.deleteClient(req.params.id as string);
      res.status(200).json({ message: "Cliente eliminado correctamente" });
    } catch (error) {
      sendError(res, error, "Error eliminando el cliente");
    }
  };
}
