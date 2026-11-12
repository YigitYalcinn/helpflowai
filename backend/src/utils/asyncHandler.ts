import { NextFunction, Request, RequestHandler, Response } from "express";

type AsyncHandler = (req: Request, res: Response, next: NextFunction) => unknown;

/**
 * Express 4 does not forward rejected promises to the error middleware, so an
 * error thrown inside an async handler would leave the request hanging (and
 * crash the process as an unhandled rejection). Every async route goes through
 * this wrapper.
 */
export function wrap(handler: AsyncHandler): RequestHandler {
  return (req, res, next) => {
    Promise.resolve()
      .then(() => handler(req, res, next))
      .catch(next);
  };
}
