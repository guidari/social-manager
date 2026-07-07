import { z } from "zod";

export const signupSchema = z.object({
  email: z.string().trim().toLowerCase().email("Must be a valid email address"),
  password: z.string().min(8, "Must be at least 8 characters"),
  name: z.string().trim().min(1, "Name is required"),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Must be a valid email address"),
  password: z.string().min(1, "Password is required"),
});
