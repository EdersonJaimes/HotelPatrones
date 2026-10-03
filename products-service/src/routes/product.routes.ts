import { Router } from "express";
import { ProductController } from "../controllers/product.controller";
import { authenticateToken, requireRole } from "../middlewares/auth.middleware";
import { validateRequest } from "../middlewares/validation.middleware";
import {
  createProductValidator,
  productIdValidator,
  updateProductValidator
} from "../validators/product.validator";

const router = Router();
const controller = new ProductController();

// Consulta del catálogo: admin o recepcionista (recepción necesita ver los productos).
router.get("/", authenticateToken, controller.list);
router.get("/:id", authenticateToken, productIdValidator, validateRequest, controller.getById);

// Alta, edición y baja del catálogo: solo administrador.
router.post(
  "/",
  authenticateToken,
  requireRole("admin"),
  createProductValidator,
  validateRequest,
  controller.create
);

router.put(
  "/:id",
  authenticateToken,
  requireRole("admin"),
  updateProductValidator,
  validateRequest,
  controller.update
);

router.delete(
  "/:id",
  authenticateToken,
  requireRole("admin"),
  productIdValidator,
  validateRequest,
  controller.remove
);

export default router;
