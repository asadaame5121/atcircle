import { z } from "zod";

export const siteRegistrationSchema = z.object({
    url: z.string().url("Invalid site URL"),
    title: z.string().min(1, "Site title is required"),
    description: z.string().max(500).optional().or(z.literal("")),
    rss_url: z.string().url("Invalid RSS URL").optional().or(z.literal("")),
});

export const siteUpdateSchema = z.object({
    url: z.string().url("Invalid site URL"),
    title: z.string().min(1, "Site title is required"),
    description: z.string().max(500).optional().or(z.literal("")),
    rss_url: z.string().url("Invalid RSS URL").optional().or(z.literal("")),
});
