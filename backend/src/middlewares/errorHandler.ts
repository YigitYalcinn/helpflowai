import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { failure } from "../utils/apiResponse.js";
import { AppError } from "../utils/errors.js";

export function notFound(req: Request, _res: Response, next: NextFunction) {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404));
}

export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (error instanceof ZodError) {
    return res.status(422).json(failure("Validation failed", error.flatten()));
  }

  if (error instanceof AppError) {
    return res.status(error.statusCode).json(failure(error.message));
  }

  console.error(error);
  return res.status(500).json(failure("Internal server error"));
}
