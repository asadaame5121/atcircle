import { z } from "zod";
import { httpUrl } from "./url.js";

export const siteRegistrationSchema = z.object({
    url: httpUrl("Invalid site URL"),
    title: z.string().min(1, "Site title is required"),
    description: z.string().max(500).optional().or(z.literal("")),
    rss_url: httpUrl("Invalid RSS URL").optional().or(z.literal("")),
});

export const siteUpdateSchema = z.object({
    url: httpUrl("Invalid site URL"),
    title: z.string().min(1, "Site title is required"),
    description: z.string().max(500).optional().or(z.literal("")),
    rss_url: httpUrl("Invalid RSS URL").optional().or(z.literal("")),
});
