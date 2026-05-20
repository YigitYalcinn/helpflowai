import { Router } from "express";
import { prisma } from "../config/prisma.js";
import { defaultDepartments, ensureBootstrapData } from "../services/bootstrapService.js";
import { success } from "../utils/apiResponse.js";

export const publicRoutes = Router();

publicRoutes.get("/departments", async (_req, res) => {
  try {
    let departments = await prisma.department.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, description: true }
    });

    if (departments.length === 0) {
      await ensureBootstrapData();
      departments = await prisma.department.findMany({
        orderBy: { name: "asc" },
        select: { id: true, name: true, description: true }
      });
    }

    return res.json(success(departments));
  } catch (error) {
    console.error("Failed to load public departments", error);
    return res.json(success(defaultDepartments.map((name) => ({ id: name, name, description: null }))));
  }
});
