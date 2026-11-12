import { Router } from "express";
import { Role } from "@prisma/client";
import { dashboard, report, reportOverview } from "../controllers/dashboardController.js";
import { requireAuth, requireRole } from "../middlewares/authMiddleware.js";
import { wrap } from "../utils/asyncHandler.js";

export const dashboardRoutes = Router();

const staff = requireRole(Role.IT_STAFF, Role.ADMIN);

// The dashboard is always scoped to what the signed-in user may see; the three
// paths exist so each role's frontend can call its own URL.
dashboardRoutes.get("/dashboard", requireAuth, wrap(dashboard));
dashboardRoutes.get("/dashboard/employee", requireAuth, wrap(dashboard));
dashboardRoutes.get("/dashboard/it", requireAuth, wrap(dashboard));
dashboardRoutes.get("/dashboard/admin", requireAuth, wrap(dashboard));
dashboardRoutes.get("/reports/overview", requireAuth, staff, wrap(reportOverview));
dashboardRoutes.get("/reports/:group", requireAuth, staff, wrap(report));
