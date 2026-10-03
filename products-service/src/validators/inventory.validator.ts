import { body, param, query } from "express-validator";

export const stockMovementValidator = [
  body("productId")
    .exists().withMessage("productId es obligatorio").bail()
    .isMongoId().withMessage("productId inválido"),

  body("quantity")
    .exists().withMessage("quantity es obligatorio").bail()
    .isInt({ min: 1 }).withMessage("quantity debe ser un entero mayor a 0")
    .toInt(),

  body("reason")
    .exists().withMessage("reason es obligatorio").bail()
    .isString().withMessage("reason debe ser texto")
    .trim()
    .notEmpty().withMessage("reason no puede estar vacío")
    .isLength({ max: 200 }).withMessage("reason no puede superar 200 caracteres")
];

export const movementsProductIdValidator = [
  param("productId").isMongoId().withMessage("productId inválido")
];

export const topConsumedValidator = [
  query("limit")
    .optional()
    .isInt({ min: 1, max: 50 }).withMessage("limit debe ser un entero entre 1 y 50")
];
