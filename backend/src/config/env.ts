import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.string().default("development"),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().optional(),
  JWT_SECRET: z.string().optional(),
  JWT_EXPIRES_IN: z.string().default("7d"),
  FRONTEND_URL: z.string().default("http://localhost:5173"),
  CORS_ORIGINS: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default("gpt-4o-mini")
}).passthrough();

export const env = envSchema.parse(process.env);

export const corsOrigins = (env.CORS_ORIGINS ?? env.FRONTEND_URL)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

export function isAllowedCorsOrigin(origin?: string) {
  if (!origin) return true;
  if (corsOrigins.includes(origin)) return true;

  try {
    const hostname = new URL(origin).hostname;
    return hostname === "vercel.app" || hostname.endsWith(".vercel.app");
  } catch {
    return false;
  }
}
