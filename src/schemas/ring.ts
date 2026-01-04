import { z } from "zod";

export const createRingSchema = z.object({
    title: z.string().min(1, "Title is required").max(100),
    description: z.string().max(500).optional(),
});

export const joinRingSchema = z.object({
    ring_uri: z.string().min(1, "Ring URI is required"),
    url: z.string().url("Invalid site URL"),
    title: z.string().min(1, "Site title is required"),
    rss: z.string().url("Invalid RSS URL").optional().or(z.literal("")),
});

export const ringUpdateSchema = z.object({
    uri: z.string().min(1),
    title: z.string().min(1).max(100),
    description: z.string().max(500).optional().or(z.literal("")),
    status: z.enum(["open", "closed"]),
    acceptance_policy: z.enum(["manual", "automatic"]),
    admin_did: z.string().min(1),
    slug: z
        .string()
        .regex(/^[a-z0-9-]{3,32}$/)
        .optional()
        .or(z.literal("")),
});

export const ringActionSchema = z.object({
    uri: z.string().min(1),
});

export const ringQuerySchema = z.object({
    ring_uri: z.string().min(1).optional(),
});
