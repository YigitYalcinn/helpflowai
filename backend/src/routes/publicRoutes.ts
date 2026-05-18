import { Router } from "express";
import { prisma } from "../config/prisma.js";
import { success } from "../utils/apiResponse.js";

export const publicRoutes = Router();

publicRoutes.get("/departments", async (_req, res) => {
  const departments = await prisma.department.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, description: true }
  });

  res.json(success(departments));
});
