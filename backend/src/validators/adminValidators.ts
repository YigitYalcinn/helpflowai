import { z } from "zod";
import { Role } from "@prisma/client";

export const nameDescriptionSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  isActive: z.boolean().optional()
});

export const categorySchema = nameDescriptionSchema.extend({
  supportUnitId: z.string().min(1)
});

export const updateUserSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  role: z.nativeEnum(Role).optional(),
  departmentId: z.string().nullable().optional(),
  supportUnitId: z.string().nullable().optional()
});
