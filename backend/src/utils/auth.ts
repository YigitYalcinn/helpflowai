import jwt from "jsonwebtoken";
import { Role } from "@prisma/client";
import { env } from "../config/env.js";

export type JwtPayload = {
  userId: string;
  role: Role;
};

export function signToken(payload: JwtPayload) {
  return jwt.sign(payload, jwtSecret(), { expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"] });
}

export function verifyToken(token: string) {
  return jwt.verify(token, jwtSecret()) as JwtPayload;
}

function jwtSecret() {
  if (!env.JWT_SECRET || env.JWT_SECRET.length < 16) {
    throw new Error("JWT_SECRET must be configured with at least 16 characters");
  }

  return env.JWT_SECRET;
}
