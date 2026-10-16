import { body, param } from "express-validator";

const RESERVATION_CHANNELS = ["walk_in", "phone", "online", "corporate"];

export const createReservationValidator = [
  body("roomId")
    .exists().withMessage("roomId es obligatorio")
    .isString().withMessage("roomId debe ser un identificador válido"),

  body("clientName")
    .exists().withMessage("clientName es obligatorio")
    .isString().isLength({ min: 2 }).withMessage("clientName debe tener al menos 2 caracteres"),

  body("clientDocument").optional().isString(),
  body("clientPhone").optional().isString(),

  body("checkIn")
    .exists().withMessage("checkIn es obligatorio")
    .isISO8601().withMessage("checkIn debe ser una fecha válida"),

  body("checkOut")
    .exists().withMessage("checkOut es obligatorio")
    .isISO8601().withMessage("checkOut debe ser una fecha válida"),

  body("guests")
    .exists().withMessage("guests es obligatorio")
    .isInt({ min: 1 }).withMessage("guests debe ser un entero mayor a 0"),

  body("channel")
    .exists().withMessage("channel es obligatorio")
    .isIn(RESERVATION_CHANNELS).withMessage(`channel debe ser uno de: ${RESERVATION_CHANNELS.join(", ")}`),

  body("notes").optional().isString()
];

export const updateReservationValidator = [
  param("id").isMongoId().withMessage("id inválido"),

  body("clientName").optional().isString().isLength({ min: 2 }).withMessage("clientName debe tener al menos 2 caracteres"),
  body("clientDocument").optional().isString(),
  body("clientPhone").optional().isString(),
  body("checkIn").optional().isISO8601().withMessage("checkIn debe ser una fecha válida"),
  body("checkOut").optional().isISO8601().withMessage("checkOut debe ser una fecha válida"),
  body("guests").optional().isInt({ min: 1 }).withMessage("guests debe ser un entero mayor a 0"),
  body("notes").optional().isString()
];

export const reservationIdValidator = [
  param("id").isMongoId().withMessage("id inválido")
];

export const quickCheckinValidator = [
  body("roomId")
    .exists().withMessage("roomId es obligatorio")
    .isString().withMessage("roomId debe ser un identificador válido"),

  body("clientName")
    .exists().withMessage("clientName es obligatorio")
    .isString().isLength({ min: 2 }).withMessage("clientName debe tener al menos 2 caracteres"),

  body("clientDocument").optional().isString(),
  body("clientPhone").optional().isString(),

  body("guests")
    .optional()
    .isInt({ min: 1 }).withMessage("guests debe ser un entero mayor a 0")
];

export const addConsumptionValidator = [
  param("id").isMongoId().withMessage("id inválido"),

  body("productId")
    .exists().withMessage("productId es obligatorio")
    .isString().withMessage("productId debe ser un identificador válido"),

  body("quantity")
    .exists().withMessage("quantity es obligatorio")
    .isInt({ min: 1 }).withMessage("quantity debe ser un entero mayor a 0")
];
