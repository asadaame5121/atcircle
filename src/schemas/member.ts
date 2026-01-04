import { z } from "zod";

export const memberQuerySchema = z.object({
    ring_uri: z.string().min(1, "ring_uri required"),
});

export const memberUpdateSchema = z.object({
    ring_uri: z.string().min(1),
    member_did: z.string().min(1),
    status: z.enum(["approved", "pending", "suspended"]),
});

export const memberActionSchema = z.object({
    ring_uri: z.string().min(1),
    member_did: z.string().min(1),
});

export const blockActionSchema = z.object({
    ring_uri: z.string().min(1),
    member_did: z.string().min(1),
    reason: z.string().optional().or(z.literal("")),
});
