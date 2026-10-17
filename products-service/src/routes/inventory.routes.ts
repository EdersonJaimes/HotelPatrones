import { Router } from "express";
import { InventoryController } from "../controllers/inventory.controller";
import { authenticateToken, requireRole } from "../middlewares/auth.middleware";
import { validateRequest } from "../middlewares/validation.middleware";
import {
  movementsProductIdValidator,
  recentMovementsValidator,
  stockMovementValidator,
  topConsumedValidator
} from "../validators/inventory.validator";

const router = Router();
const controller = new InventoryController();

router.get("/", authenticateToken, controller.list);

// Resumen liviano para el Dashboard (lo usa la Facade del gateway).
router.get("/summary", authenticateToken, controller.summary);

// Va antes de "/movements/:productId" solo por orden de lectura; no hay
// conflicto real porque los segmentos literales son distintos.
router.get(
  "/top-consumed",
  authenticateToken,
  topConsumedValidator,
  validateRequest,
  controller.topConsumed
);

// Kardex general (últimos movimientos de todos los productos).
router.get(
  "/movements",
  authenticateToken,
  recentMovementsValidator,
  validateRequest,
  controller.recentMovements
);

router.get(
  "/movements/:productId",
  authenticateToken,
  movementsProductIdValidator,
  validateRequest,
  controller.movements
);

// Mover stock es una operación del día a día: admin y recepcionista.
router.post(
  "/add",
  authenticateToken,
  requireRole("admin", "recepcionista"),
  stockMovementValidator,
  validateRequest,
  controller.add
);

router.post(
  "/remove",
  authenticateToken,
  requireRole("admin", "recepcionista"),
  stockMovementValidator,
  validateRequest,
  controller.remove
);

export default router;
