import { Router } from "express";
import { ClientController } from "../controllers/client.controller";
import { authenticateToken, requireRole } from "../middlewares/auth.middleware";
import { validateRequest } from "../middlewares/validation.middleware";
import {
  clientIdValidator,
  createClientValidator,
  updateClientValidator
} from "../validators/client.validator";

const router = Router();
const controller = new ClientController();

// Consulta y registro del día a día: admin o recepcionista.
router.get("/", authenticateToken, controller.list);
router.get("/:id", authenticateToken, clientIdValidator, validateRequest, controller.getById);

router.post(
  "/",
  authenticateToken,
  requireRole("admin", "recepcionista"),
  createClientValidator,
  validateRequest,
  controller.create
);

router.put(
  "/:id",
  authenticateToken,
  requireRole("admin", "recepcionista"),
  updateClientValidator,
  validateRequest,
  controller.update
);

// Eliminar: solo administrador, igual que en rooms-service y products-service.
router.delete(
  "/:id",
  authenticateToken,
  requireRole("admin"),
  clientIdValidator,
  validateRequest,
  controller.remove
);

export default router;
