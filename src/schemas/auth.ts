import { z } from "zod";

export const loginSchema = z.object({
    handle: z.string().min(1).max(253),
    // Validate 'next' to be a relative path to prevent open redirects
    next: z
        .string()
        .regex(/^\/[^/]/, "Must be a relative path")
        .optional()
        .or(z.literal("")),
});
