import { body, param, query } from "express-validator";

export const startStayValidator = [
  body("roomId").isMongoId().withMessage("roomId inválido")
];

export const addProductValidator = [
  body("stayId").isMongoId().withMessage("stayId inválido"),
  body("productId").isMongoId().withMessage("productId inválido"),
  body("quantity").isInt({ min: 1 }).withMessage("quantity debe ser un entero mayor a 0")
];

export const checkoutValidator = [
  body("stayId").isMongoId().withMessage("stayId inválido")
];

export const activeStayValidator = [
  param("roomId").isMongoId().withMessage("roomId inválido")
];

export const listStaysValidator = [
  query("status").optional().isIn(["active", "closed"]).withMessage("status debe ser active o closed")
];
