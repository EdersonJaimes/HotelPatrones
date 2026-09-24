import { Router } from "express";
import { RoomController } from "../controllers/room.controller";
import { authenticateToken, requireRole } from "../middlewares/auth.middleware";
import { validateRequest } from "../middlewares/validation.middleware";
import {
  createFromPrototypeValidator,
  createRoomValidator,
  roomIdValidator,
  updateRoomStatusValidator,
  updateRoomValidator
} from "../validators/room.validator";

const router = Router();
const controller = new RoomController();

// Listado y detalle: cualquier usuario autenticado (admin o recepcionista).
router.get("/", authenticateToken, controller.list);

// IMPORTANTE: estas rutas literales van ANTES de "/:id" para que Express
// no interprete "prototypes" como si fuera un id de Mongo.
router.get("/prototypes", authenticateToken, controller.listPrototypes);

router.get("/:id", authenticateToken, roomIdValidator, validateRequest, controller.getById);

// Alta, edición completa y baja: solo administrador.
router.post(
  "/",
  authenticateToken,
  requireRole("admin"),
  createRoomValidator,
  validateRequest,
  controller.create
);

// Patrón Prototype: crea una habitación clonando la plantilla del tipo indicado.
router.post(
  "/prototypes/:type",
  authenticateToken,
  requireRole("admin"),
  createFromPrototypeValidator,
  validateRequest,
  controller.createFromPrototype
);

router.put(
  "/:id",
  authenticateToken,
  requireRole("admin"),
  updateRoomValidator,
  validateRequest,
  controller.update
);

router.delete(
  "/:id",
  authenticateToken,
  requireRole("admin"),
  roomIdValidator,
  validateRequest,
  controller.remove
);

// Cambio de estado (ej. ocupar/liberar/limpieza): admin y recepcionista.
router.patch(
  "/:id/status",
  authenticateToken,
  requireRole("admin", "recepcionista"),
  updateRoomStatusValidator,
  validateRequest,
  controller.updateStatus
);

export default router;
