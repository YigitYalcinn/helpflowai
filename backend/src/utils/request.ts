import { Request } from "express";
import { AppError } from "./errors.js";

export function routeParam(req: Request, name: string) {
  const value = req.params[name];
  if (typeof value !== "string") throw new AppError(`Invalid route parameter: ${name}`, 400);
  return value;
}
