import { Request, Response } from "express";
import { ProductService } from "../services/product.service";
import { sendError } from "./error.mapper";

export class ProductController {
  private readonly productService = new ProductService();

  list = async (_req: Request, res: Response): Promise<void> => {
    try {
      res.status(200).json(await this.productService.listProducts());
    } catch (error) {
      sendError(res, error, "Error obteniendo productos");
    }
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    try {
      res.status(200).json(await this.productService.getProductById(req.params.id as string));
    } catch (error) {
      sendError(res, error, "Error obteniendo el producto");
    }
  };

  create = async (req: Request, res: Response): Promise<void> => {
    try {
      // Se toman solo los campos permitidos: el stock NO se puede fijar desde aquí.
      const { name, price, category } = req.body;
      const product = await this.productService.createProduct({ name, price, category });
      res.status(201).json(product);
    } catch (error) {
      sendError(res, error, "Error creando el producto");
    }
  };

  update = async (req: Request, res: Response): Promise<void> => {
    try {
      const { name, price, category } = req.body;

      const changes = Object.fromEntries(
        Object.entries({ name, price, category }).filter(([, value]) => value !== undefined)
      );

      const product = await this.productService.updateProduct(req.params.id as string, changes);
      res.status(200).json(product);
    } catch (error) {
      sendError(res, error, "Error actualizando el producto");
    }
  };

  remove = async (req: Request, res: Response): Promise<void> => {
    try {
      await this.productService.deleteProduct(req.params.id as string);
      res.status(200).json({ message: "Producto eliminado correctamente" });
    } catch (error) {
      sendError(res, error, "Error eliminando el producto");
    }
  };
}
