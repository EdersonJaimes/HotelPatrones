import { body, param } from "express-validator";
import { ROOM_AMENITIES } from "../models/room.model";

const ROOM_TYPES = ["individual", "doble", "triple", "suite"];
const ROOM_STATUSES = ["available", "occupied", "cleaning", "maintenance"];

export const createRoomValidator = [
  body("number")
    .exists().withMessage("number es obligatorio")
    .isInt({ min: 1 }).withMessage("number debe ser un entero mayor a 0"),

  body("type")
    .exists().withMessage("type es obligatorio")
    .isIn(ROOM_TYPES).withMessage(`type debe ser uno de: ${ROOM_TYPES.join(", ")}`),

  body("price")
    .exists().withMessage("price es obligatorio")
    .isFloat({ min: 0 }).withMessage("price debe ser un número mayor o igual a 0"),

  body("status")
    .optional()
    .isIn(ROOM_STATUSES).withMessage(`status debe ser uno de: ${ROOM_STATUSES.join(", ")}`),

  body("capacity")
    .optional()
    .isInt({ min: 1 }).withMessage("capacity debe ser un entero mayor a 0"),

  body("amenities")
    .optional()
    .isArray().withMessage("amenities debe ser un arreglo"),

  body("amenities.*")
    .isIn(ROOM_AMENITIES).withMessage(`cada amenity debe ser uno de: ${ROOM_AMENITIES.join(", ")}`)
];

export const updateRoomValidator = [
  param("id").isMongoId().withMessage("id inválido"),

  body("number")
    .optional()
    .isInt({ min: 1 }).withMessage("number debe ser un entero mayor a 0"),

  body("type")
    .optional()
    .isIn(ROOM_TYPES).withMessage(`type debe ser uno de: ${ROOM_TYPES.join(", ")}`),

  body("price")
    .optional()
    .isFloat({ min: 0 }).withMessage("price debe ser un número mayor o igual a 0"),

  body("status")
    .optional()
    .isIn(ROOM_STATUSES).withMessage(`status debe ser uno de: ${ROOM_STATUSES.join(", ")}`),

  body("capacity")
    .optional()
    .isInt({ min: 1 }).withMessage("capacity debe ser un entero mayor a 0"),

  body("amenities")
    .optional()
    .isArray().withMessage("amenities debe ser un arreglo"),

  body("amenities.*")
    .isIn(ROOM_AMENITIES).withMessage(`cada amenity debe ser uno de: ${ROOM_AMENITIES.join(", ")}`)
];

export const updateRoomStatusValidator = [
  param("id").isMongoId().withMessage("id inválido"),

  body("status")
    .exists().withMessage("status es obligatorio")
    .isIn(ROOM_STATUSES).withMessage(`status debe ser uno de: ${ROOM_STATUSES.join(", ")}`)
];

export const roomIdValidator = [
  param("id").isMongoId().withMessage("id inválido")
];

export const prototypeTypeValidator = [
  param("type").isIn(ROOM_TYPES).withMessage(`type debe ser uno de: ${ROOM_TYPES.join(", ")}`)
];

export const createFromPrototypeValidator = [
  param("type").isIn(ROOM_TYPES).withMessage(`type debe ser uno de: ${ROOM_TYPES.join(", ")}`),

  body("number")
    .exists().withMessage("number es obligatorio")
    .isInt({ min: 1 }).withMessage("number debe ser un entero mayor a 0"),

  body("price")
    .optional()
    .isFloat({ min: 0 }).withMessage("price debe ser un número mayor o igual a 0"),

  body("status")
    .optional()
    .isIn(ROOM_STATUSES).withMessage(`status debe ser uno de: ${ROOM_STATUSES.join(", ")}`),

  body("amenities")
    .optional()
    .isArray().withMessage("amenities debe ser un arreglo"),

  body("amenities.*")
    .isIn(ROOM_AMENITIES).withMessage(`cada amenity debe ser uno de: ${ROOM_AMENITIES.join(", ")}`)
];
