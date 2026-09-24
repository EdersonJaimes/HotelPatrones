import { Response } from "express";
import { AuthenticatedRequest } from "../middlewares/auth.middleware";
import { RoomService } from "../services/room.service";

export class RoomController {
  private readonly roomService = new RoomService();

  list = async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const rooms = await this.roomService.listRooms();
      res.status(200).json(rooms);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error obteniendo habitaciones";
      res.status(500).json({ message });
    }
  };

  getById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const room = await this.roomService.getRoomById(req.params.id as string);
      res.status(200).json(room);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error obteniendo habitación";
      const status = message === "Habitación no encontrada" ? 404 : 500;
      res.status(status).json({ message });
    }
  };

  create = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const room = await this.roomService.createRoom(req.body);
      res.status(201).json(room);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error creando habitación";
      const status =
        message === "Ya existe una habitación con ese número" ? 409 :
        message.startsWith("El precio para este tipo") ? 400 : 500;
      res.status(status).json({ message });
    }
  };

  update = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const room = await this.roomService.updateRoom(req.params.id as string, req.body);
      res.status(200).json(room);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error actualizando habitación";
      const status =
        message === "Habitación no encontrada" ? 404 :
        message === "Ya existe una habitación con ese número" ? 409 :
        message.startsWith("El precio para este tipo") ? 400 : 500;
      res.status(status).json({ message });
    }
  };

  updateStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const room = await this.roomService.updateRoomStatus(req.params.id as string, req.body.status);
      res.status(200).json(room);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error actualizando estado";
      const status = message === "Habitación no encontrada" ? 404 : 500;
      res.status(status).json({ message });
    }
  };

  remove = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      await this.roomService.deleteRoom(req.params.id as string);
      res.status(200).json({ message: "Habitación eliminada correctamente" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error eliminando habitación";
      const status = message === "Habitación no encontrada" ? 404 : 500;
      res.status(status).json({ message });
    }
  };

  // ---- Patrón Prototype ----

  listPrototypes = async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
    const prototypes = this.roomService.listPrototypes();
    res.status(200).json(prototypes);
  };

  createFromPrototype = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const type = req.params.type as any;
      const room = await this.roomService.createRoomFromPrototype({ ...req.body, type });
      res.status(201).json(room);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error creando habitación desde prototipo";
      const status =
        message === "Ya existe una habitación con ese número" ? 409 :
        message.startsWith("El precio para este tipo") ? 400 :
        message === "Tipo de habitación no soportado" ? 400 : 500;
      res.status(status).json({ message });
    }
  };
}
