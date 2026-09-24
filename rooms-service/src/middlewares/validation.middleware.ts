import { NextFunction, Request, Response } from "express";
import { validationResult } from "express-validator";

export function validateRequest(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    res.status(400).json({
      message: "Error de validación",
      errors: errors.array().map((error) => ({
        field: "path" in error ? error.path : "body",
        message: error.msg
      }))
    });
    return;
  }

  next();
}
