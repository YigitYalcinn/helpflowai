import { z } from "zod";
import { Role } from "@prisma/client";

export const nameDescriptionSchema = z.object({
  name: z.string().trim().min(2, "Ad en az 2 karakter olmalı").max(120),
  description: z.string().trim().max(500).nullable().optional(),
  isActive: z.boolean().optional()
});

export const categorySchema = nameDescriptionSchema.extend({
  supportUnitId: z.string().min(1, "Destek ekibi seçin")
});

const password = z.string().min(8, "Şifre en az 8 karakter olmalı").max(128);

export const createUserSchema = z.object({
  name: z.string().trim().min(2, "Ad soyad en az 2 karakter olmalı").max(120),
  email: z.string().trim().toLowerCase().email("Geçerli bir e-posta girin"),
  password,
  role: z.nativeEnum(Role),
  departmentId: z.string().nullable().optional(),
  supportUnitId: z.string().nullable().optional()
});

export const updateUserSchema = z.object({
  name: z.string().trim().min(2, "Ad soyad en az 2 karakter olmalı").max(120).optional(),
  email: z.string().trim().toLowerCase().email("Geçerli bir e-posta girin").optional(),
  password: password.optional(),
  role: z.nativeEnum(Role).optional(),
  departmentId: z.string().nullable().optional(),
  supportUnitId: z.string().nullable().optional()
});
