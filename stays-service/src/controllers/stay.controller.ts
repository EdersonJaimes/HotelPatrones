import { Response } from "express";
import { sendError } from "../errors";
import { AuthenticatedRequest } from "../middlewares/auth.middleware";
import { StayService } from "../services/stay.service";

// El token ya fue validado por authenticateToken; aquí solo se reenvía a los
// servicios vecinos (rooms, products).
function bearerToken(req: AuthenticatedRequest): string {
  return (req.headers.authorization as string).substring(7);
}

export class StayController {
  private readonly stayService = new StayService();

  list = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const status = req.query.status as "active" | "closed" | undefined;
      res.status(200).json(await this.stayService.listStays(status));
    } catch (error) {
      sendError(res, error, "Error obteniendo las estancias");
    }
  };

  getActive = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      res.status(200).json(await this.stayService.getActiveStay(req.params.roomId as string));
    } catch (error) {
      sendError(res, error, "Error obteniendo la estancia activa");
    }
  };

  start = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const stay = await this.stayService.startStay(req.body.roomId, bearerToken(req), req.user?.id);
      res.status(201).json(stay);
    } catch (error) {
      sendError(res, error, "Error iniciando la estancia");
    }
  };

  addProduct = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { stayId, productId, quantity } = req.body;
      res.status(200).json(await this.stayService.addProduct(stayId, productId, quantity, bearerToken(req)));
    } catch (error) {
      sendError(res, error, "Error agregando el producto");
    }
  };

  checkout = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      res.status(200).json(await this.stayService.checkout(req.body.stayId, bearerToken(req)));
    } catch (error) {
      sendError(res, error, "Error realizando el checkout");
    }
  };
}
