import { body, param } from "express-validator";
import { PRODUCT_CATEGORIES } from "../models/product.model";

const categoryMessage = `category debe ser uno de: ${PRODUCT_CATEGORIES.join(", ")}`;

export const createProductValidator = [
  body("name")
    .exists().withMessage("name es obligatorio").bail()
    .isString().withMessage("name debe ser texto")
    .trim()
    .notEmpty().withMessage("name no puede estar vacío")
    .isLength({ max: 100 }).withMessage("name no puede superar 100 caracteres"),

  body("price")
    .exists().withMessage("price es obligatorio").bail()
    .isFloat({ min: 0 }).withMessage("price debe ser un número mayor o igual a 0")
    .toFloat(),

  body("category")
    .optional()
    .isIn(PRODUCT_CATEGORIES).withMessage(categoryMessage)
];

export const updateProductValidator = [
  param("id").isMongoId().withMessage("id inválido"),

  body("name")
    .optional()
    .isString().withMessage("name debe ser texto")
    .trim()
    .notEmpty().withMessage("name no puede estar vacío")
    .isLength({ max: 100 }).withMessage("name no puede superar 100 caracteres"),

  body("price")
    .optional()
    .isFloat({ min: 0 }).withMessage("price debe ser un número mayor o igual a 0")
    .toFloat(),

  body("category")
    .optional()
    .isIn(PRODUCT_CATEGORIES).withMessage(categoryMessage)
];

export const productIdValidator = [
  param("id").isMongoId().withMessage("id inválido")
];
