import { z } from "zod";
import { httpUrl } from "./url.js";

export const createRingSchema = z.object({
    title: z.string().min(1, "Title is required").max(100),
    description: z.string().max(500).optional(),
    acceptance_policy: z.enum(["automatic", "manual"]).default("automatic"),
    // 作成と同時に参加させる自分のサイト。旧フォームでは送られない
    url: httpUrl("Invalid site URL").optional().or(z.literal("")),
    site_title: z.string().max(200).optional().or(z.literal("")),
    rss: httpUrl("Invalid RSS URL").optional().or(z.literal("")),
});

export const joinRingSchema = z.object({
    ring_uri: z.string().min(1, "Ring URI is required"),
    url: httpUrl("Invalid site URL"),
    title: z.string().min(1, "Site title is required"),
    rss: httpUrl("Invalid RSS URL").optional().or(z.literal("")),
});

// リングレコードの AT URI (at://<did>/net.asadaame5121.at-circle.ring/<rkey>)
const ringAtUri = z
    .string()
    .regex(
        /^at:\/\/did:[a-z]+:[a-zA-Z0-9._:%-]+\/net\.asadaame5121\.at-circle\.ring\/[a-zA-Z0-9._~:-]{1,512}$/,
        "Invalid ring URI",
    );

const did = z
    .string()
    .regex(/^did:[a-z]+:[a-zA-Z0-9._:%-]{1,2048}$/, "Invalid DID");

export const ringUpdateSchema = z.object({
    uri: ringAtUri,
    title: z.string().min(1).max(100),
    description: z.string().max(500).optional().or(z.literal("")),
    status: z.enum(["open", "closed"]),
    acceptance_policy: z.enum(["manual", "automatic"]),
    admin_did: did,
    slug: z
        .string()
        .regex(/^[a-z0-9-]{3,32}$/)
        .optional()
        .or(z.literal("")),
    banner_url: httpUrl().optional().or(z.literal("")),
});

export const ringActionSchema = z.object({
    uri: z.string().min(1),
});

export const ringQuerySchema = z.object({
    ring: z.string().min(1).optional(),
    slug: z.string().optional(),
    member: z.string().optional(),
});

export const companionQuerySchema = z.object({
    ring: z.string().optional(),
    slug: z.string().optional(),
    member: z.string().optional(),
});
