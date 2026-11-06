import { Hono } from "hono";
import { PUBLIC_URL } from "../../config.js";
import { logger as pinoLogger } from "../../lib/logger.js";
import { RingRepository } from "../../repositories/ring.repository.js";
import { AtProtoService } from "../../services/atproto.js";
import { MembershipActions } from "../../services/membership-actions.js";
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
            await new RingRepository(c.env.DB).upsertFromRecord(r.uri, r.value);
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
                        await new RingRepository(c.env.DB).upsertFromRecord(
                            ringUri,
                            ringData.value,
                        );
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

        // 移行: DB にだけある承認・停止を decision として PDS に記録する
        try {
            const written = await MembershipActions.backfillDecisions(
                c.env.DB,
                agent,
                rings.map((r) => r.uri),
            );
            if (written > 0) {
                pinoLogger.info({
                    msg: "[Sync] Backfilled decisions",
                    written,
                });
            }
        } catch (e) {
            pinoLogger.error({
                msg: "[Sync] Decision backfill failed",
                error: e,
            });
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
        return c.text("Sync failed due to an internal error.", 500);
    }

    return c.redirect("/dashboard?msg=synced");
});

export default app;
