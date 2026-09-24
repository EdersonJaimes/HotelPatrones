import { body, param } from "express-validator";

export const loginValidator = [
  body("username")
    .exists().withMessage("username es obligatorio")
    .isString().withMessage("username debe ser un string")
    .trim()
    .notEmpty().withMessage("username no puede estar vacío"),

  body("password")
    .exists().withMessage("password es obligatorio")
    .isString().withMessage("password debe ser un string")
    .notEmpty().withMessage("password no puede estar vacío")
];

export const createUserValidator = [
  body("username")
    .exists().withMessage("username es obligatorio")
    .isString().withMessage("username debe ser un string")
    .trim()
    .isLength({ min: 3, max: 50 }).withMessage("username debe tener entre 3 y 50 caracteres"),

  body("name")
    .exists().withMessage("name es obligatorio")
    .isString().withMessage("name debe ser un string")
    .trim()
    .notEmpty().withMessage("name no puede estar vacío"),

  body("password")
    .exists().withMessage("password es obligatorio")
    .isString().withMessage("password debe ser un string")
    .isLength({ min: 6 }).withMessage("password debe tener al menos 6 caracteres"),

  body("role")
    .exists().withMessage("role es obligatorio")
    .isIn(["admin", "recepcionista"])
    .withMessage("role debe ser admin o recepcionista")
];

export const updateUserValidator = [
  param("id").isMongoId().withMessage("id inválido"),

  body("name")
    .optional()
    .isString().withMessage("name debe ser un string")
    .trim()
    .notEmpty().withMessage("name no puede estar vacío"),

  body("password")
    .optional({ checkFalsy: true })
    .isString().withMessage("password debe ser un string")
    .isLength({ min: 6 }).withMessage("password debe tener al menos 6 caracteres"),

  body("role")
    .optional()
    .isIn(["admin", "recepcionista"])
    .withMessage("role debe ser admin o recepcionista"),

  body("active")
    .optional()
    .isBoolean().withMessage("active debe ser booleano")
];

export const userIdValidator = [
  param("id").isMongoId().withMessage("id inválido")
];
