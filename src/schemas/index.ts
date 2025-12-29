import { z } from "zod";

export const ringQuerySchema = z.object({
    ring: z.string().min(1, "Ring URI is required"),
});

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

export const siteRegistrationSchema = z.object({
    url: z.string().url("Invalid site URL"),
    title: z.string().min(1, "Site title is required"),
    description: z.string().max(500).optional(),
    rss_url: z.string().url("Invalid RSS URL").optional().or(z.literal("")),
});

export const ringUpdateSchema = z.object({
    uri: z.string().min(1),
    title: z.string().min(1).max(100),
    description: z.string().max(500).optional(),
    status: z.enum(["open", "closed"]),
    acceptance_policy: z.enum(["manual", "automatic"]),
});

export const memberActionSchema = z.object({
    member_uri: z.string().min(1),
});
