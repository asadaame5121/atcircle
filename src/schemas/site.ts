import { z } from "zod";
import { httpUrl } from "./url.js";

export const siteRegistrationSchema = z.object({
    url: httpUrl("Invalid site URL"),
    title: z.string().min(1, "Site title is required").max(100),
    description: z.string().max(500).optional().or(z.literal("")),
    rss_url: httpUrl("Invalid RSS URL").optional().or(z.literal("")),
    // 候補として選んだプロフィールのリンク (app.bsky.actor.link)
    link_uri: z.string().max(512).optional().or(z.literal("")),
    link_cid: z.string().max(256).optional().or(z.literal("")),
});

export const siteUpdateSchema = z.object({
    url: httpUrl("Invalid site URL"),
    title: z.string().min(1, "Site title is required").max(100),
    description: z.string().max(500).optional().or(z.literal("")),
    rss_url: httpUrl("Invalid RSS URL").optional().or(z.literal("")),
});
