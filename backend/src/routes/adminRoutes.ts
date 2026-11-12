import { NextFunction, Request, Response, Router } from "express";
import { Role } from "@prisma/client";
import { createResource, createUser, deleteResource, deleteUser, listResource, ResourceType, updateResource, updateUser, users } from "../controllers/adminController.js";
import { requireAuth, requireRole } from "../middlewares/authMiddleware.js";
import { wrap } from "../utils/asyncHandler.js";

export const adminRoutes = Router();

const admin = requireRole(Role.ADMIN);

adminRoutes.use(requireAuth);
adminRoutes.get("/users", admin, wrap(users));
adminRoutes.post("/users", admin, wrap(createUser));
adminRoutes.patch("/users/:id", admin, wrap(updateUser));
adminRoutes.delete("/users/:id", admin, wrap(deleteUser));

function resourceRoutes(path: string, resource: ResourceType) {
  const tag = (req: Request, _res: Response, next: NextFunction) => {
    req.params.resource = resource;
    next();
  };

  // Everyone signed in can read these lists (ticket forms need them); only admins can change them.
  adminRoutes.get(path, tag, wrap(listResource));
  adminRoutes.post(path, admin, tag, wrap(createResource));
  adminRoutes.patch(`${path}/:id`, admin, tag, wrap(updateResource));
  adminRoutes.delete(`${path}/:id`, admin, tag, wrap(deleteResource));
}

resourceRoutes("/departments", "department");
resourceRoutes("/support-units", "supportUnit");
resourceRoutes("/categories", "category");
