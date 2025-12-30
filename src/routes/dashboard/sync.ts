import { Hono } from "hono";
import { PUBLIC_URL } from "../../config.js";
import { AtProtoService } from "../../services/atproto.js";
import { restoreAgent } from "../../services/oauth.js";
import type { AppVariables, Bindings } from "../../types/bindings.js";

const app = new Hono<{ Bindings: Bindings; Variables: AppVariables }>();

// POST /dashboard/sync
app.post("/", async (c) => {
    const payload = c.get("jwtPayload");
    const did = payload.sub;

    try {
        const agent = await restoreAgent(c.env.DB as any, PUBLIC_URL, did);
        if (!agent) return c.redirect("/login");

        console.log(`[Sync] Starting sync for DID: ${did}`);

        // 1. Sync Rings
        const rings = await AtProtoService.listRings(agent, did);
        for (const r of rings) {
            await c.env.DB.prepare(
                "INSERT OR REPLACE INTO rings (uri, owner_did, admin_did, title, description, acceptance_policy, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            )
                .bind(
                    r.uri,
                    did,
                    r.value.admin || did,
                    r.value.title,
                    r.value.description || null,
                    r.value.acceptancePolicy || "automatic",
                    r.value.status || "open",
                    r.value.createdAt
                        ? Math.floor(
                              new Date(r.value.createdAt).getTime() / 1000,
                          )
                        : Math.floor(Date.now() / 1000),
                )
                .run();
        }

        // 2. Sync Memberships
        const memberships = await AtProtoService.listMemberRecords(agent, did);
        const mySite = (await c.env.DB.prepare(
            "SELECT id FROM sites WHERE user_did = ?",
        )
            .bind(did)
            .first()) as { id: number };

        if (mySite) {
            for (const m of memberships) {
                const ringUri = m.value.ring.uri;
                await c.env.DB.prepare(
                    "INSERT OR REPLACE INTO memberships (ring_uri, site_id, member_uri) VALUES (?, ?, ?)",
                )
                    .bind(ringUri, mySite.id, m.uri)
                    .run();
            }
        }

        // 3. Sync Blocks
        try {
            const blocks = await AtProtoService.listBlockRecords(agent, did);
            for (const b of blocks) {
                const createdAt = b.value.createdAt
                    ? new Date(b.value.createdAt).getTime() / 1000
                    : null;
                await c.env.DB.prepare(
                    "INSERT OR REPLACE INTO block_records (uri, ring_uri, subject_did, created_at) VALUES (?, ?, ?, ?)",
                )
                    .bind(b.uri, b.value.ring.uri, b.value.subject, createdAt)
                    .run();
            }
        } catch (blockSyncError) {
            console.error("Failed to sync blocks:", blockSyncError);
        }
    } catch (e) {
        console.error("Sync failed:", e);
        return c.text(`Sync failed: ${(e as any).message}`, 500);
    }

    return c.redirect("/dashboard?msg=synced");
});

export default app;
