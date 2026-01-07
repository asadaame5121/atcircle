import { AtUri } from "@atproto/api";
import { PUBLIC_URL } from "../config.js";
import { logger as pinoLogger } from "../lib/logger.js";
import type { Bindings } from "../types/bindings.js";
import { AtProtoService } from "./atproto.js";
import { restoreAgent } from "./oauth.js";

/**
 * AdminService provides utility methods for global maintenance and user management.
 */
export const AdminService = {
    /**
     * Syncs all users' data from their respective PDS.
     * Iterates through all users in the database and performs a full synchronization.
     */
    async syncAllUsersData(db: Bindings["DB"]) {
        pinoLogger.info({ msg: "[AdminService] Starting global sync" });
        const users = await db.prepare("SELECT did FROM users").all();
        if (!users.results) return { success: true, processed: 0, errors: 0 };

        let processed = 0;
        let errors = 0;

        for (const user of users.results as { did: string }[]) {
            try {
                const agent = await restoreAgent(db, PUBLIC_URL, user.did);
                if (!agent) {
                    pinoLogger.warn({
                        msg: "[AdminService] Could not restore agent for user",
                        did: user.did,
                    });
                    errors++;
                    continue;
                }

                // Call syncUserData (which is part of this object to allow mocking/spying in tests)
                await this.syncUserData(db, agent, user.did);
                processed++;
            } catch (e) {
                pinoLogger.error({
                    msg: "[AdminService] Failed to sync user",
                    did: user.did,
                    error: e,
                });
                errors++;
            }
        }

        return { success: true, processed, errors };
    },

    /**
     * Syncs a single user's rings, memberships, and blocks from AT Proto.
     * Implements logic to recover from malformed URIs.
     */
    async syncUserData(db: Bindings["DB"], agent: any, did: string) {
        // 1. Sync Rings
        try {
            const rings = await AtProtoService.listRings(agent, did);
            for (const r of rings) {
                await db
                    .prepare(
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
        } catch (e) {
            pinoLogger.error({
                msg: "[AdminService] Failed to list rings",
                did,
                error: e,
            });
        }

        // 2. Sync Memberships
        try {
            const memberships = await AtProtoService.listMemberRecords(
                agent,
                did,
            );
            const mySite = (await db
                .prepare("SELECT id FROM sites WHERE user_did = ?")
                .bind(did)
                .first()) as { id: number };

            if (mySite) {
                for (const m of memberships) {
                    let ringUri = m.value.ring.uri;

                    // RECOVERY: Handle malformed HTTP URIs
                    if (ringUri?.startsWith("http")) {
                        try {
                            const url = new URL(ringUri);
                            const extracted = url.searchParams.get("ring");
                            if (extracted?.startsWith("at://")) {
                                ringUri = extracted;
                            }
                        } catch {
                            /* ignore */
                        }
                    }

                    // Ensure the ring exists locally for foreign key consistency
                    const localRing = await db
                        .prepare("SELECT 1 FROM rings WHERE uri = ?")
                        .bind(ringUri)
                        .first();
                    if (!localRing) {
                        try {
                            const ringData = await AtProtoService.getRing(
                                agent,
                                ringUri,
                            );
                            const ownerDid = new AtUri(ringUri).hostname;
                            await db
                                .prepare(
                                    "INSERT OR REPLACE INTO rings (uri, owner_did, admin_did, title, description, acceptance_policy, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                                )
                                .bind(
                                    ringUri,
                                    ownerDid,
                                    ringData.value.admin || ownerDid,
                                    ringData.value.title,
                                    ringData.value.description || null,
                                    ringData.value.acceptancePolicy ||
                                        "automatic",
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
                        } catch (e) {
                            pinoLogger.error({
                                msg: "[AdminService] Failed to fetch missing ring during sync",
                                ringUri,
                                error: e,
                            });
                            continue;
                        }
                    }

                    await db
                        .prepare(
                            "INSERT OR REPLACE INTO memberships (ring_uri, site_id, member_uri) VALUES (?, ?, ?)",
                        )
                        .bind(ringUri, mySite.id, m.uri)
                        .run();
                }
            }
        } catch (e) {
            pinoLogger.error({
                msg: "[AdminService] Failed to sync memberships",
                did,
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
                await db
                    .prepare(
                        "INSERT OR REPLACE INTO block_records (uri, ring_uri, subject_did, created_at) VALUES (?, ?, ?, ?)",
                    )
                    .bind(b.uri, b.value.ring.uri, b.value.subject, createdAt)
                    .run();
            }
        } catch (e) {
            pinoLogger.error({
                msg: "[AdminService] Failed to sync blocks",
                did,
                error: e,
            });
        }
    },

    /**
     * Completely removes a user and all their associated data from the local database.
     * Follows a specific deletion order to maintain referential integrity without explicit CASCADE.
     */
    async removeUser(db: Bindings["DB"], did: string) {
        pinoLogger.info({ msg: "[AdminService] Removing user", did });

        try {
            // 1. Clean up sites and related antenna items/memberships
            const sites = await db
                .prepare("SELECT id FROM sites WHERE user_did = ?")
                .bind(did)
                .all();
            const siteIds = (sites.results || []) as { id: number }[];

            for (const site of siteIds) {
                await db
                    .prepare("DELETE FROM antenna_items WHERE site_id = ?")
                    .bind(site.id)
                    .run();
                await db
                    .prepare("DELETE FROM memberships WHERE site_id = ?")
                    .bind(site.id)
                    .run();
            }
            await db
                .prepare("DELETE FROM sites WHERE user_did = ?")
                .bind(did)
                .run();

            // 2. Clean up rings owned by user and related memberships/requests/blocks
            const ownedRings = await db
                .prepare("SELECT uri FROM rings WHERE owner_did = ?")
                .bind(did)
                .all();
            const ringUris = (ownedRings.results || []) as { uri: string }[];

            for (const ring of ringUris) {
                await db
                    .prepare("DELETE FROM memberships WHERE ring_uri = ?")
                    .bind(ring.uri)
                    .run();
                await db
                    .prepare("DELETE FROM join_requests WHERE ring_uri = ?")
                    .bind(ring.uri)
                    .run();
                await db
                    .prepare("DELETE FROM block_records WHERE ring_uri = ?")
                    .bind(ring.uri)
                    .run();
            }
            await db
                .prepare("DELETE FROM rings WHERE owner_did = ?")
                .bind(did)
                .run();

            // 3. Final cleanup of memberships the user might have in other rings (redundant but safe)
            // They should have been deleted in step 1 if sites were correctly identified.

            // 4. Delete OAuth states and session info (optional, but good for privacy)
            // Note: oauth_states doesn't have a did column in our schema, it's keyed by 'key'.
            // If we have a way to link it, we should. For now, we skip.

            // 5. Finally delete user
            await db.prepare("DELETE FROM users WHERE did = ?").bind(did).run();

            return { success: true };
        } catch (e) {
            pinoLogger.error({
                msg: "[AdminService] Error removing user",
                did,
                error: e,
            });
            throw e;
        }
    },
};
