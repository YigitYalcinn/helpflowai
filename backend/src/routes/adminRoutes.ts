import { Router } from "express";
import { Role } from "@prisma/client";
import { createResource, deleteResource, deleteUser, listResource, updateResource, updateUser, users } from "../controllers/adminController.js";
import { requireAuth, requireRole } from "../middlewares/authMiddleware.js";

export const adminRoutes = Router();

adminRoutes.use(requireAuth);
adminRoutes.get("/users", requireRole(Role.ADMIN), users);
adminRoutes.patch("/users/:id", requireRole(Role.ADMIN), updateUser);
adminRoutes.delete("/users/:id", requireRole(Role.ADMIN), deleteUser);

function resourceRoutes(path: string, resource: "department" | "supportUnit" | "category") {
  adminRoutes.get(path, (req, _res, next) => {
    req.params.resource = resource;
    next();
  }, listResource);
  adminRoutes.post(path, requireRole(Role.ADMIN), (req, _res, next) => {
    req.params.resource = resource;
    next();
  }, createResource);
  adminRoutes.patch(`${path}/:id`, requireRole(Role.ADMIN), (req, _res, next) => {
    req.params.resource = resource;
    next();
  }, updateResource);
  adminRoutes.delete(`${path}/:id`, requireRole(Role.ADMIN), (req, _res, next) => {
    req.params.resource = resource;
    next();
  }, deleteResource);
}

resourceRoutes("/departments", "department");
resourceRoutes("/support-units", "supportUnit");
resourceRoutes("/categories", "category");
