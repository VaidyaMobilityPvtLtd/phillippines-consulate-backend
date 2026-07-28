import type { RequestHandler } from "express";
import type { ZodSchema } from "zod";
import { AppError } from "../lib/errors.js";

export function validateBody(schema: ZodSchema): RequestHandler {
  return (req, _res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      next(new AppError(400, "Validation failed", result.error.flatten()));
      return;
    }
    req.body = result.data;
    next();
  };
}
