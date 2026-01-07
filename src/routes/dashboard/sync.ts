import { AtUri } from "@atproto/api";
import { Hono } from "hono";
import { PUBLIC_URL } from "../../config.js";
import { logger as pinoLogger } from "../../lib/logger.js";
import { AtProtoService } from "../../services/atproto.js";
import { restoreAgent } from "../../services/oauth.js";
import type { AppVariables, Bindings } from "../../types/bindings.js";

const app = new Hono<{ Bindings: Bindings; Variables: AppVariables }>();

// POST /dashboard/sync
app.post("/", async (c) => {
    const payload = c.get("jwtPayload");
    const did = payload.sub;

    try {
        const agent = await restoreAgent(c.env.DB, PUBLIC_URL, did);
        if (!agent) return c.redirect("/login");

        pinoLogger.info({ msg: "[Sync] Starting sync", did });

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
                let ringUri = m.value.ring.uri;

                // RECOVERY: Check for malformed HTTP URIs found in some records
                if (ringUri.startsWith("http")) {
                    try {
                        const url = new URL(ringUri);
                        const extracted = url.searchParams.get("ring");
                        if (extracted?.startsWith("at://")) {
                            ringUri = extracted;
                        }
                    } catch {
                        // Ignore parsing errors
                    }
                }

                // Check if ring exists locally
                const localRing = await c.env.DB.prepare(
                    "SELECT 1 FROM rings WHERE uri = ?",
                )
                    .bind(ringUri)
                    .first();

                if (!localRing) {
                    try {
                        // Fetch ring metadata from PDS
                        const ringData = await AtProtoService.getRing(
                            agent,
                            ringUri,
                        );
                        const ownerDid = new AtUri(ringUri).hostname;

                        await c.env.DB.prepare(
                            "INSERT OR REPLACE INTO rings (uri, owner_did, admin_did, title, description, acceptance_policy, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                        )
                            .bind(
                                ringUri,
                                ownerDid,
                                ringData.value.admin || ownerDid,
                                ringData.value.title,
                                ringData.value.description || null,
                                ringData.value.acceptancePolicy || "automatic",
                                ringData.value.status || "open",
                                ringData.value.createdAt
                                    ? Math.floor(
                                          new Date(
                                              ringData.value.createdAt,
                                          ).getTime() / 1000,
                                      )
                                    : Math.floor(Date.now() / 1000),
                            )
                            .run();
                        pinoLogger.info({
                            msg: "[Sync] Fetched missing ring",
                            ringUri,
                        });
                    } catch (e) {
                        pinoLogger.error({
                            msg: "[Sync] Failed to fetch missing ring",
                            ringUri,
                            error: e,
                        });
                        // Continue? If we fail to fetch ring, we can't insert membership due to FK.
                        continue;
                    }
                }

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
            pinoLogger.error({
                msg: "Failed to sync blocks",
                error: blockSyncError,
            });
        }
    } catch (e) {
        pinoLogger.error({ msg: "Sync failed", error: e });
        return c.text(`Sync failed: ${(e as any).message}`, 500);
    }

    return c.redirect("/dashboard?msg=synced");
});

export default app;
