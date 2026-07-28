import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../lib/errors.js";
import { config } from "../config.js";

export type AuthUser = { id: string; email: string; name: string };

type JwtPayload = { sub: string; email: string };

export async function login(email: string, password: string) {
  const user = await prisma.adminUser.findUnique({ where: { email } });
  if (!user) {
    throw new AppError(401, "Invalid email or password");
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    throw new AppError(401, "Invalid email or password");
  }

  const token = jwt.sign(
    { sub: user.id, email: user.email } satisfies JwtPayload,
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn } as jwt.SignOptions,
  );

  return {
    token,
    user: { id: user.id, email: user.email, name: user.name },
  };
}

export async function getUserById(id: string): Promise<AuthUser | null> {
  const user = await prisma.adminUser.findUnique({
    where: { id },
    select: { id: true, email: true, name: true },
  });
  return user;
}

export function verifyToken(token: string): JwtPayload {
  try {
    return jwt.verify(token, config.jwtSecret) as JwtPayload;
  } catch {
    throw new AppError(401, "Invalid or expired token");
  }
}
