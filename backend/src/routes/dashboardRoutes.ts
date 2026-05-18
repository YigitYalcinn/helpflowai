import { Router } from "express";
import { dashboard, report } from "../controllers/dashboardController.js";
import { requireAuth } from "../middlewares/authMiddleware.js";

export const dashboardRoutes = Router();

dashboardRoutes.use(requireAuth);
dashboardRoutes.get("/dashboard/employee", dashboard);
dashboardRoutes.get("/dashboard/it", dashboard);
dashboardRoutes.get("/dashboard/admin", dashboard);
dashboardRoutes.get("/reports/:group", report);
