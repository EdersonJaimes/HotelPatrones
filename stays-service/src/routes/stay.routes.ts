import { Router } from "express";
import { StayController } from "../controllers/stay.controller";
import { authenticateToken, requireRole } from "../middlewares/auth.middleware";
import { validateRequest } from "../middlewares/validation.middleware";
import {
  activeStayValidator,
  addProductValidator,
  checkoutValidator,
  listStaysValidator,
  startStayValidator
} from "../validators/stay.validator";

const router = Router();
const controller = new StayController();

// Todo el flujo de mostrador es de admin y recepcionista.
router.use(authenticateToken, requireRole("admin", "recepcionista"));

router.get("/", listStaysValidator, validateRequest, controller.list);
router.get("/active/:roomId", activeStayValidator, validateRequest, controller.getActive);

router.post("/start", startStayValidator, validateRequest, controller.start);
router.post("/add-product", addProductValidator, validateRequest, controller.addProduct);
router.post("/checkout", checkoutValidator, validateRequest, controller.checkout);

export default router;
