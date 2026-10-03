import { body, param } from "express-validator";

// El formulario del frontend usa <input type="number">, así que document/phone
// pueden llegar como number o como string: se normalizan a string antes de
// aplicar el patrón "solo dígitos" (la misma regla que ya valida el frontend).
const toDigitsString = (value: unknown) => String(value ?? "").trim();

export const createClientValidator = [
  body("name")
    .exists().withMessage("name es obligatorio").bail()
    .isString().withMessage("name debe ser texto")
    .trim()
    .notEmpty().withMessage("name no puede estar vacío")
    .isLength({ max: 100 }).withMessage("name no puede superar 100 caracteres"),

  body("document")
    .exists().withMessage("document es obligatorio").bail()
    .customSanitizer(toDigitsString)
    .matches(/^\d{5,20}$/).withMessage("document debe tener solo números (5 a 20 dígitos)"),

  body("phone")
    .exists().withMessage("phone es obligatorio").bail()
    .customSanitizer(toDigitsString)
    .matches(/^\d{7,15}$/).withMessage("phone debe tener solo números (7 a 15 dígitos)")
];

export const updateClientValidator = [
  param("id").isMongoId().withMessage("id inválido"),

  body("name")
    .optional()
    .isString().withMessage("name debe ser texto")
    .trim()
    .notEmpty().withMessage("name no puede estar vacío")
    .isLength({ max: 100 }).withMessage("name no puede superar 100 caracteres"),

  body("document")
    .optional()
    .customSanitizer(toDigitsString)
    .matches(/^\d{5,20}$/).withMessage("document debe tener solo números (5 a 20 dígitos)"),

  body("phone")
    .optional()
    .customSanitizer(toDigitsString)
    .matches(/^\d{7,15}$/).withMessage("phone debe tener solo números (7 a 15 dígitos)")
];

export const clientIdValidator = [
  param("id").isMongoId().withMessage("id inválido")
];
