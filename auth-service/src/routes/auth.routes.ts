import { Router } from "express";
import { AuthController } from "../controllers/auth.controller";
import { authenticateToken, requireRole } from "../middlewares/auth.middleware";
import { validateRequest } from "../middlewares/validation.middleware";
import {
  createUserValidator,
  loginValidator,
  updateUserValidator,
  userIdValidator
} from "../validators/auth.validator";

const router = Router();
const controller = new AuthController();

// Login usado por el frontend.
router.post("/login", loginValidator, validateRequest, controller.login);

// Gestión de usuarios: solamente administrador.
router.get("/users", authenticateToken, requireRole("admin"), controller.listUsers);

router.post(
  "/users",
  authenticateToken,
  requireRole("admin"),
  createUserValidator,
  validateRequest,
  controller.createUser
);

router.put(
  "/users/:id",
  authenticateToken,
  requireRole("admin"),
  updateUserValidator,
  validateRequest,
  controller.updateUser
);

router.delete(
  "/users/:id",
  authenticateToken,
  requireRole("admin"),
  userIdValidator,
  validateRequest,
  controller.deleteUser
);

// Comprueba el token actualmente autenticado.
router.get("/me", authenticateToken, controller.me);

export default router;
