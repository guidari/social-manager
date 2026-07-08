import { z } from "zod";

export const updateWorkspaceSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").optional(),
    defaultTimezone: z.string().trim().min(1, "Must be a valid IANA timezone").optional(),
  })
  .refine((data) => data.name !== undefined || data.defaultTimezone !== undefined, {
    message: "Provide at least one field to update",
  });
