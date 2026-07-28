import type { RequestHandler } from "express";
import { AppError } from "../lib/errors.js";
import { getUserById, verifyToken } from "../services/auth.js";

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; email: string; name: string };
    }
  }
}

export const requireAuth: RequestHandler = async (req, _res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      throw new AppError(401, "Authentication required");
    }
    const token = header.slice("Bearer ".length);
    const payload = verifyToken(token);
    const user = await getUserById(payload.sub);
    if (!user) {
      throw new AppError(401, "Authentication required");
    }
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
};
