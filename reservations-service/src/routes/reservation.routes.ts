import { Router } from "express";
import { ReservationController } from "../controllers/reservation.controller";
import { authenticateToken, requireRole } from "../middlewares/auth.middleware";
import { validateRequest } from "../middlewares/validation.middleware";
import {
  addConsumptionValidator,
  createReservationValidator,
  quickCheckinValidator,
  reservationIdValidator,
  updateReservationValidator
} from "../validators/reservation.validator";

const router = Router();
const controller = new ReservationController();

// Listado, detalle, alta y edición: admin y recepcionista gestionan reservas día a día.
router.get("/", authenticateToken, controller.list);
// Resumen liviano para el Dashboard (lo usa la Facade del gateway); va antes de "/:id".
router.get("/summary", authenticateToken, controller.summary);
// Antes y después del Flyweight medidos en este proceso (vista Patrones); va antes de "/:id".
router.get("/flyweight/memory", authenticateToken, requireRole("admin"), controller.flyweightMemory);
router.get("/:id", authenticateToken, reservationIdValidator, validateRequest, controller.getById);

router.post(
  "/",
  authenticateToken,
  requireRole("admin", "recepcionista"),
  createReservationValidator,
  validateRequest,
  controller.create
);

// Recepción: buscar la reserva activa (checked_in) de una habitación, para
// abrir su "cuenta". Va antes de "/:id" por el mismo motivo de siempre.
router.get(
  "/active/:roomId",
  authenticateToken,
  requireRole("admin", "recepcionista"),
  controller.activeByRoom
);

// Recepción: click en la habitación -> crea + confirma + hace check-in en
// un solo paso. Va antes de "/:id" por claridad, aunque no hay colisión real
// de patrones (segmentos distintos).
router.post(
  "/quick-checkin",
  authenticateToken,
  requireRole("admin", "recepcionista"),
  quickCheckinValidator,
  validateRequest,
  controller.quickCheckin
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

// La "cuenta" de consumo: solo mientras la reserva está checked_in.
router.post(
  "/:id/consumptions",
  authenticateToken,
  requireRole("admin", "recepcionista"),
  addConsumptionValidator,
  validateRequest,
  controller.addConsumption
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
