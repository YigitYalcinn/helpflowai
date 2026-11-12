import { NextFunction, Request, Response } from "express";
import { env } from "../config/env.js";
import { failure } from "../utils/apiResponse.js";

const buckets = new Map<string, { count: number; resetAt: number }>();

export function securityHeaders(_req: Request, res: Response, next: NextFunction) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  next();
}

/**
 * Small in-memory fixed-window limiter. `name` gives each limiter its own
 * counters so a strict limit on one route group does not eat into another's.
 */
export function rateLimit({ windowMs, max, name = "global" }: { windowMs: number; max: number; name?: string }) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (env.NODE_ENV === "test") return next();

    const now = Date.now();
    if (buckets.size > 10_000) {
      for (const [key, bucket] of buckets) if (bucket.resetAt <= now) buckets.delete(key);
    }

    const key = `${name}:${req.ip ?? req.socket.remoteAddress ?? "unknown"}`;
    const bucket = buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    bucket.count += 1;

    if (bucket.count > max) {
      const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
      res.setHeader("Retry-After", String(retryAfter));
      return res.status(429).json(failure("Çok fazla istek gönderildi, lütfen biraz bekleyin"));
    }

    return next();
  };
}
