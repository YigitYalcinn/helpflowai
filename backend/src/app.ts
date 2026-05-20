import cors from "cors";
import express from "express";
import "./types.js";
import { corsOrigins } from "./config/env.js";
import { adminRoutes } from "./routes/adminRoutes.js";
import { aiRoutes } from "./routes/aiRoutes.js";
import { authRoutes } from "./routes/authRoutes.js";
import { dashboardRoutes } from "./routes/dashboardRoutes.js";
import { publicRoutes } from "./routes/publicRoutes.js";
import { ticketRoutes } from "./routes/ticketRoutes.js";
import { errorHandler, notFound } from "./middlewares/errorHandler.js";
import { rateLimit, securityHeaders } from "./middlewares/securityMiddleware.js";

export const app = express();

app.set("trust proxy", 1);
app.use(securityHeaders);
app.use(cors({
  origin(origin, callback) {
    if (!origin || corsOrigins.includes(origin)) return callback(null, true);
    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true
}));
app.use(rateLimit({ windowMs: 60_000, max: 180 }));
app.use(express.json({ limit: "2mb" }));

app.get("/", (_req, res) => res.json({ success: true, message: "HelpFlow API root" }));
app.get("/favicon.ico", (_req, res) => res.status(204).end());
app.get("/api/health", (_req, res) => res.json({ success: true, message: "HelpFlow API is running" }));
app.use("/api/public", publicRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/tickets", ticketRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api", dashboardRoutes);
app.use("/api", adminRoutes);

app.use(notFound);
app.use(errorHandler);
