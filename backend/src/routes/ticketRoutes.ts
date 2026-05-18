import { Router } from "express";
import { Role } from "@prisma/client";
import {
  addInternalNote,
  addMessage,
  assign,
  category,
  close,
  destroy,
  index,
  internalNotes,
  messages,
  priority,
  reopen,
  resolve,
  show,
  status,
  store,
  transfer,
  update
} from "../controllers/ticketController.js";
import { requireAuth, requireRole } from "../middlewares/authMiddleware.js";

export const ticketRoutes = Router();

ticketRoutes.use(requireAuth);
ticketRoutes.get("/", index);
ticketRoutes.post("/", store);
ticketRoutes.get("/:id", show);
ticketRoutes.patch("/:id", update);
ticketRoutes.delete("/:id", requireRole(Role.ADMIN), destroy);
ticketRoutes.patch("/:id/assign", requireRole(Role.IT_STAFF, Role.ADMIN), assign);
ticketRoutes.patch("/:id/status", requireRole(Role.IT_STAFF, Role.ADMIN), status);
ticketRoutes.patch("/:id/priority", requireRole(Role.IT_STAFF, Role.ADMIN), priority);
ticketRoutes.patch("/:id/category", requireRole(Role.IT_STAFF, Role.ADMIN), category);
ticketRoutes.patch("/:id/transfer", requireRole(Role.IT_STAFF, Role.ADMIN), transfer);
ticketRoutes.post("/:id/resolve", requireRole(Role.IT_STAFF, Role.ADMIN), resolve);
ticketRoutes.post("/:id/close", close);
ticketRoutes.post("/:id/reopen", requireRole(Role.IT_STAFF, Role.ADMIN), reopen);
ticketRoutes.get("/:id/messages", messages);
ticketRoutes.post("/:id/messages", addMessage);
ticketRoutes.get("/:id/internal-notes", requireRole(Role.IT_STAFF, Role.ADMIN), internalNotes);
ticketRoutes.post("/:id/internal-notes", requireRole(Role.IT_STAFF, Role.ADMIN), addInternalNote);
