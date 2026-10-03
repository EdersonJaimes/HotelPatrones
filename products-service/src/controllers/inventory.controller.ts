import { Request, Response } from "express";
import { InventoryService } from "../services/inventory.service";
import { sendError } from "./error.mapper";

export class InventoryController {
  private readonly inventoryService = new InventoryService();

  list = async (_req: Request, res: Response): Promise<void> => {
    try {
      res.status(200).json(await this.inventoryService.listInventory());
    } catch (error) {
      sendError(res, error, "Error obteniendo el inventario");
    }
  };

  add = async (req: Request, res: Response): Promise<void> => {
    try {
      const { productId, quantity, reason } = req.body;
      res.status(200).json(await this.inventoryService.addStock(productId, quantity, reason));
    } catch (error) {
      sendError(res, error, "Error agregando stock");
    }
  };

  remove = async (req: Request, res: Response): Promise<void> => {
    try {
      const { productId, quantity, reason } = req.body;
      res.status(200).json(await this.inventoryService.removeStock(productId, quantity, reason));
    } catch (error) {
      sendError(res, error, "Error descontando stock");
    }
  };

  movements = async (req: Request, res: Response): Promise<void> => {
    try {
      res.status(200).json(await this.inventoryService.getMovements(req.params.productId as string));
    } catch (error) {
      sendError(res, error, "Error obteniendo los movimientos");
    }
  };

  topConsumed = async (req: Request, res: Response): Promise<void> => {
    try {
      const limit = Number(req.query.limit) || 5;
      res.status(200).json(await this.inventoryService.getTopConsumed(limit));
    } catch (error) {
      sendError(res, error, "Error obteniendo el top de productos consumidos");
    }
  };
}
