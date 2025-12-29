import { z } from "zod";

// Zod schema for Bluesky handle validation
// Simplified regex: allow alphanumeric, dots, and hyphens.
// Official spec is stricter but this is good for 1st pass.
export const handleSchema = z
    .string()
    .min(3, { message: "Handle must be at least 3 characters" })
    .regex(/^[a-zA-Z0-9.-]+$/, {
        message: "Handle can only contain letters, numbers, hyphens, and dots",
    })
    .refine((val) => !val.startsWith(".") && !val.endsWith("."), {
        message: "Handle cannot start or end with a dot",
    })
    .refine((val) => !val.includes(".."), {
        message: "Handle cannot contain consecutive dots",
    });

export const validateHandle = (handle: string) => {
    return handleSchema.safeParse(handle);
};

// Placeholder for future Auth implementation
// Placeholder for future Auth implementation
export const Auth = {
    // TODO: Implement OAuth flow
    async initiateLogin(handle: string) {
        const validation = validateHandle(handle);
        if (!validation.success) {
            // ZodError issues: validation.error.issues is the correct path for ZodError
            throw new Error(validation.error.issues[0].message);
        }
        // Logic to resolve DID and start OAuth would go here
        return {
            valid: true,
            handle: handle,
            // mock authorization URL
            authUrl: `https://bsky.social/oauth/authorize?handle=${handle}`,
        };
    },

    async resolveDid(handle: string): Promise<string> {
        // Mock DID resolution
        // In reality, this would query the PLDS or Bsky API
        return `did:plc:mock-${handle.replace(/\./g, "-")}`;
    },
};
