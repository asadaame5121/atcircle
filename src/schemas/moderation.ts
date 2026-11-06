import { z } from "zod";

// PDS 上の申請は ring_uri + subject_uri、従来の DB の申請は request_id で指定する
export const requestActionSchema = z
    .object({
        request_id: z.string().min(1).optional(),
        ring_uri: z.string().min(1).optional(),
        subject_uri: z.string().min(1).optional(),
    })
    .refine((v) => !!v.request_id || (!!v.ring_uri && !!v.subject_uri), {
        message: "request_id or ring_uri + subject_uri is required",
    });

export const moderationMemberActionSchema = z.object({
    member_uri: z.string().min(1),
});

export const unblockActionSchema = z.object({
    uri: z.string().min(1),
});
