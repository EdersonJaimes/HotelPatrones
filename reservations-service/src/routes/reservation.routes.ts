import { Router } from "express";
import { ReservationController } from "../controllers/reservation.controller";
import { authenticateToken, requireRole } from "../middlewares/auth.middleware";
import { validateRequest } from "../middlewares/validation.middleware";
import {
  createReservationValidator,
  reservationIdValidator,
  updateReservationValidator
} from "../validators/reservation.validator";

const router = Router();
const controller = new ReservationController();

// Listado, detalle, alta y edición: admin y recepcionista gestionan reservas día a día.
router.get("/", authenticateToken, controller.list);
router.get("/:id", authenticateToken, reservationIdValidator, validateRequest, controller.getById);

router.post(
  "/",
  authenticateToken,
  requireRole("admin", "recepcionista"),
  createReservationValidator,
  validateRequest,
  controller.create
);

router.put(
  "/:id",
  authenticateToken,
  requireRole("admin", "recepcionista"),
  updateReservationValidator,
  validateRequest,
  controller.update
);

// Transiciones de estado del ciclo de vida de la reserva.
router.patch(
  "/:id/confirm",
  authenticateToken,
  requireRole("admin", "recepcionista"),
  reservationIdValidator,
  validateRequest,
  controller.confirm
);

router.patch(
  "/:id/check-in",
  authenticateToken,
  requireRole("admin", "recepcionista"),
  reservationIdValidator,
  validateRequest,
  controller.checkIn
);

router.patch(
  "/:id/check-out",
  authenticateToken,
  requireRole("admin", "recepcionista"),
  reservationIdValidator,
  validateRequest,
  controller.checkOut
);

router.patch(
  "/:id/cancel",
  authenticateToken,
  requireRole("admin", "recepcionista"),
  reservationIdValidator,
  validateRequest,
  controller.cancel
);

// Baja definitiva: solo administrador.
router.delete(
  "/:id",
  authenticateToken,
  requireRole("admin"),
  reservationIdValidator,
  validateRequest,
  controller.remove
);

export default router;
