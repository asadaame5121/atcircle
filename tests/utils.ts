import { type Page } from "@playwright/test";
import { SignJWT } from "jose";
import { ADMIN_DID, SECRET_KEY } from "../src/config";

export async function loginAs(
    page: Page,
    did: string,
    handle: string,
    isAdmin = false,
) {
    const secret = new TextEncoder().encode(SECRET_KEY);

    // Match the payload structure from src/routes/auth.ts
    const payload = {
        sub: did,
        handle: handle,
        role: isAdmin ? "admin" : "user",
        // exp is automatically added by setExpirationTime
    };

    const token = await new SignJWT(payload)
        .setProtectedHeader({ alg: "HS256" })
        .setExpirationTime("7d")
        .sign(secret);

    await page.context().addCookies([
        {
            name: "session",
            value: token,
            domain: "localhost",
            path: "/",
            httpOnly: true,
            secure: false, // Dev environment
            sameSite: "Lax",
        },
    ]);
}

export const TEST_USER = {
    did: "did:plc:test-user-1",
    handle: "testUser.bsky.social",
};

export const TEST_ADMIN = {
    did: ADMIN_DID || "did:plc:admin-user",
    handle: "admin.bsky.social",
};
