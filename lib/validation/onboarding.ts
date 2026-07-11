import { z } from "zod";

export const completeOnboardingSchema = z.object({
  defaultTimezone: z.string().trim().min(1, "Must be a valid IANA timezone"),
});
