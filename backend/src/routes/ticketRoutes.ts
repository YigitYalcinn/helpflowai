import { Router } from "express";
import { Role } from "@prisma/client";
import {
  assign,
  assignees,
  cancel,
  category,
  close,
  destroy,
  destroyAttachment,
  downloadAttachment,
  index,
  internalNotes,
  messages,
  priority,
  rate,
  reopen,
  resolve,
  show,
  status,
  store,
  storeAttachment,
  storeInternalNote,
  storeMessage,
  transfer,
  update
} from "../controllers/ticketController.js";
import { requireAuth, requireRole } from "../middlewares/authMiddleware.js";
import { wrap } from "../utils/asyncHandler.js";

export const ticketRoutes = Router();

const staff = requireRole(Role.IT_STAFF, Role.ADMIN);

ticketRoutes.use(requireAuth);
ticketRoutes.get("/", wrap(index));
ticketRoutes.post("/", wrap(store));
ticketRoutes.get("/:id", wrap(show));
ticketRoutes.patch("/:id", wrap(update));
ticketRoutes.delete("/:id", requireRole(Role.ADMIN), wrap(destroy));

ticketRoutes.get("/:id/assignees", staff, wrap(assignees));
ticketRoutes.patch("/:id/assign", staff, wrap(assign));
ticketRoutes.patch("/:id/status", staff, wrap(status));
ticketRoutes.patch("/:id/priority", staff, wrap(priority));
ticketRoutes.patch("/:id/category", staff, wrap(category));
ticketRoutes.patch("/:id/transfer", staff, wrap(transfer));
ticketRoutes.post("/:id/resolve", staff, wrap(resolve));

// Requesters can close, cancel and reopen their own tickets; the service enforces which states allow it.
ticketRoutes.post("/:id/close", wrap(close));
ticketRoutes.post("/:id/cancel", wrap(cancel));
ticketRoutes.post("/:id/reopen", wrap(reopen));
ticketRoutes.post("/:id/rating", requireRole(Role.EMPLOYEE), wrap(rate));

ticketRoutes.get("/:id/messages", wrap(messages));
ticketRoutes.post("/:id/messages", wrap(storeMessage));
ticketRoutes.get("/:id/internal-notes", staff, wrap(internalNotes));
ticketRoutes.post("/:id/internal-notes", staff, wrap(storeInternalNote));

ticketRoutes.post("/:id/attachments", wrap(storeAttachment));
ticketRoutes.get("/:id/attachments/:attachmentId", wrap(downloadAttachment));
ticketRoutes.delete("/:id/attachments/:attachmentId", wrap(destroyAttachment));
