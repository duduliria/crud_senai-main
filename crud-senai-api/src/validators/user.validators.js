import { z } from "zod";

export const createUserSchema = z.object({
  name: z.string().trim().min(3).max(120),
  email: z.string().trim().toLowerCase().email().max(190),
  password: z.string().min(6).max(100),
  profile: z.enum(["ADMIN", "USER"])
});

export const updateUserSchema = z.object({
  name: z.string().trim().min(3).max(120).optional(),
  email: z.string().trim().toLowerCase().email().max(190).optional(),
  profile: z.enum(["ADMIN", "USER"]).optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional()
});

export const updateStatusSchema = z.object({
  status: z.enum(["ACTIVE", "INACTIVE"])
});