import { z } from "zod";

export const requestActionSchema = z.object({
    request_id: z.string().min(1),
});

export const moderationMemberActionSchema = z.object({
    member_uri: z.string().min(1),
});

export const unblockActionSchema = z.object({
    uri: z.string().min(1),
});
