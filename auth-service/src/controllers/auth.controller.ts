import { Request, Response } from "express";
import { AuthenticatedRequest } from "../middlewares/auth.middleware";
import { AuthService } from "../services/auth.service";

export class AuthController {
  private readonly authService = new AuthService();

  login = async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await this.authService.login(
        req.body.username,
        req.body.password
      );

      res.status(200).json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error de autenticación";
      res.status(401).json({ message });
    }
  };

  createUser = async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await this.authService.createUser(req.body);

      res.status(201).json({
        message: "Usuario creado correctamente",
        user: result
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error creando usuario";
      const status = message === "El usuario ya existe" ? 409 : 500;
      res.status(status).json({ message });
    }
  };

  me = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    res.status(200).json({
      user: req.user
    });
  };

  listUsers = async (_req: Request, res: Response): Promise<void> => {
    try {
      const users = await this.authService.listUsers();
      res.status(200).json(users);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error obteniendo usuarios";
      res.status(500).json({ message });
    }
  };

  updateUser = async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await this.authService.updateUser(req.params.id as string, req.body);

      res.status(200).json({
        message: "Usuario actualizado correctamente",
        user: result
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error actualizando usuario";
      const status = message === "Usuario no encontrado" ? 404 : 500;
      res.status(status).json({ message });
    }
  };

  deleteUser = async (req: Request, res: Response): Promise<void> => {
    try {
      await this.authService.deleteUser(req.params.id as string);
      res.status(200).json({ message: "Usuario eliminado correctamente" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error eliminando usuario";
      const status = message === "Usuario no encontrado" ? 404 : 500;
      res.status(status).json({ message });
    }
  };
}
