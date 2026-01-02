import { AtUri } from "@atproto/api";
import { Hono } from "hono";
import { PUBLIC_URL } from "../../config.js";
import { AtProtoService } from "../../services/atproto.js";
import { restoreAgent } from "../../services/oauth.js";
import type { AppVariables, Bindings } from "../../types/bindings.js";

const app = new Hono<{ Bindings: Bindings; Variables: AppVariables }>();

// POST /dashboard/ring/create
app.post("/create", async (c) => {
    const payload = c.get("jwtPayload");
    const did = payload.sub;
    const body = await c.req.parseBody();
    const title = body.title as string;
    const description = body.description as string;

    if (!title) return c.text("Title required", 400);

    try {
        const agent = await restoreAgent(c.env.DB as any, PUBLIC_URL, did);
        if (!agent) return c.redirect("/login");

        const ringUri = await AtProtoService.createRing(
            agent,
            title,
            description,
        );

        // 1. Save to local DB
        await c.env.DB.prepare(
            "INSERT INTO rings (uri, owner_did, admin_did, title, description, acceptance_policy, status) VALUES (?, ?, ?, ?, ?, 'automatic', 'open')",
        )
            .bind(ringUri, did, did, title, description)
            .run();

        // 2. UX Improvement: Auto-join my own site
        const mySite = (await c.env.DB.prepare(
            "SELECT * FROM sites WHERE user_did = ?",
        )
            .bind(did)
            .first()) as any;
        if (mySite && ringUri) {
            console.log(
                `[AutoJoin] Automatically joining ${did}'s site to new ring ${ringUri}`,
            );
            try {
                const memberUri = await AtProtoService.joinRing(
                    agent,
                    ringUri,
                    {
                        url: mySite.url,
                        title: mySite.title,
                        rss: mySite.rss_url || "",
                    },
                );

                // Save membership locally
                await c.env.DB.prepare(
                    "INSERT INTO memberships (ring_uri, site_id, member_uri) VALUES (?, ?, ?)",
                )
                    .bind(ringUri, mySite.id, memberUri)
                    .run();
            } catch (joinError) {
                console.error("Failed to auto-join ring:", joinError);
            }
        }
    } catch (e) {
        console.error("Error creating ring:", e);
        return c.text("Failed to create ring", 500);
    }

    return c.redirect("/dashboard?msg=created");
});

// POST /dashboard/ring/join
app.post("/join", async (c) => {
    const payload = c.get("jwtPayload");
    const did = payload.sub;
    const body = await c.req.parseBody();
    const ringUri = ((body.ring_uri as string) || "").trim();
    const url = body.url as string;
    const title = body.title as string;
    const rss = body.rss as string;

    if (!ringUri || !url || !title) {
        return c.text("Missing required fields", 400);
    }

    try {
        const agent = await restoreAgent(c.env.DB as any, PUBLIC_URL, did);
        if (!agent) return c.redirect("/login");

        // 0. Check for existing membership or request
        const existing = await c.env.DB.prepare(`
            SELECT 1 FROM memberships m 
            JOIN sites s ON m.site_id = s.id
            WHERE m.ring_uri = ? AND s.user_did = ? AND m.status = 'approved'
            UNION ALL
            SELECT 1 FROM join_requests WHERE ring_uri = ? AND user_did = ? AND status = 'pending'
            LIMIT 1
        `)
            .bind(ringUri, did, ringUri, did)
            .first();

        if (existing) {
            return c.redirect("/dashboard?msg=already_joined_or_requested");
        }

        // 1. Fetch Ring Metadata and Save/Update locally
        let acceptancePolicy = "automatic";
        try {
            const ringData = await AtProtoService.getRing(agent, ringUri);
            acceptancePolicy = ringData.value.acceptancePolicy || "automatic";

            await c.env.DB.prepare(
                "INSERT OR REPLACE INTO rings (uri, owner_did, title, description, acceptance_policy, status) VALUES (?, ?, ?, ?, ?, ?)",
            )
                .bind(
                    ringUri,
                    new AtUri(ringUri).hostname,
                    ringData.value.title,
                    ringData.value.description || null,
                    acceptancePolicy,
                    ringData.value.status || "open",
                )
                .run();
        } catch (ringError) {
            console.error(
                `Failed to fetch ring metadata during join for URI: ${ringUri}`,
                ringError,
            );
            // Fallback to local DB if available
            const localRing = (await c.env.DB.prepare(
                "SELECT acceptance_policy FROM rings WHERE uri = ?",
            )
                .bind(ringUri)
                .first()) as any;
            if (localRing) {
                acceptancePolicy = localRing.acceptance_policy;
            }
        }

        let finalUri = "";
        let finalStatus = "approved";

        if (acceptancePolicy === "manual") {
            finalUri = await AtProtoService.createJoinRequest(agent, ringUri, {
                url,
                title,
                rss,
            });
            finalStatus = "pending";

            // Save to join_requests table
            await c.env.DB.prepare(
                "INSERT INTO join_requests (ring_uri, user_did, site_url, site_title, rss_url, atproto_uri, status) VALUES (?, ?, ?, ?, ?, ?, 'pending')",
            )
                .bind(ringUri, did, url, title, rss || null, finalUri)
                .run();
        } else {
            finalUri = await AtProtoService.joinRing(agent, ringUri, {
                url,
                title,
                rss,
            });
            finalStatus = "approved";

            // Save membership locally
            const mySite = (await c.env.DB.prepare(
                "SELECT id FROM sites WHERE user_did = ?",
            )
                .bind(did)
                .first()) as { id: number };
            if (mySite) {
                await c.env.DB.prepare(
                    "INSERT OR IGNORE INTO memberships (ring_uri, site_id, member_uri, status) VALUES (?, ?, ?, ?)",
                )
                    .bind(ringUri, mySite.id, finalUri, finalStatus)
                    .run();
            }
        }

        return c.redirect(`/dashboard?msg=joined&policy=${acceptancePolicy}`);
    } catch (e) {
        console.error("Error joining ring:", e);
        return c.text("Failed to join ring", 500);
    }
});

// POST /dashboard/ring/leave
app.post("/leave", async (c) => {
    const payload = c.get("jwtPayload");
    const did = payload.sub;
    const body = await c.req.parseBody();
    const memberUri = body.uri as string;

    if (!memberUri) return c.text("Member URI required", 400);

    try {
        const agent = await restoreAgent(c.env.DB as any, PUBLIC_URL, did);
        if (!agent) return c.redirect("/login");

        await AtProtoService.leaveRing(agent, memberUri);

        // Remove from local DB
        await c.env.DB.prepare("DELETE FROM memberships WHERE member_uri = ?")
            .bind(memberUri)
            .run();

        return c.redirect("/dashboard?msg=left");
    } catch (e) {
        console.error("Error leaving ring:", e);
        return c.text("Failed to leave ring", 500);
    }
});

// POST /dashboard/ring/update
app.post("/update", async (c) => {
    const payload = c.get("jwtPayload");
    const did = payload.sub;
    const body = await c.req.parseBody();

    const uri = body.uri as string;
    const title = body.title as string;
    const description = body.description as string;
    const status = body.status as "open" | "closed";
    const acceptance = body.acceptance_policy as "automatic" | "manual";
    const adminDid = body.admin_did as string;
    const slug = ((body.slug as string) || "").trim().toLowerCase() || null;

    if (!uri || !title || !status || !acceptance || !adminDid) {
        return c.text("Missing required fields", 400);
    }

    try {
        const agent = await restoreAgent(c.env.DB as any, PUBLIC_URL, did);
        if (!agent) return c.redirect("/login");

        // 1. Update Repository (ATProto)
        await AtProtoService.updateRing(
            agent,
            uri,
            title,
            description,
            status,
            acceptance,
            adminDid,
        );

        // 2. Update AppView (Indexer)
        await c.env.DB.prepare(
            "UPDATE rings SET acceptance_policy = ?, status = ?, admin_did = ?, slug = ? WHERE uri = ?",
        )
            .bind(acceptance, status, adminDid, slug, uri)
            .run();
    } catch (e) {
        console.error("Error updating circle:", e);
        return c.text("Failed to update circle", 500);
    }

    return c.redirect("/dashboard?msg=updated");
});

// POST /dashboard/ring/delete
app.post("/delete", async (c) => {
    const payload = c.get("jwtPayload");
    const did = payload.sub;
    const body = await c.req.parseBody();
    const uri = body.uri as string;

    if (!uri) return c.text("Ring URI required", 400);

    try {
        const agent = await restoreAgent(c.env.DB as any, PUBLIC_URL, did);
        if (!agent) return c.redirect("/login");

        // 1. Verify ownership (simple check: hostname of URI should match DID)
        // More robust: check existing local DB record
        const ring = (await c.env.DB.prepare(
            "SELECT owner_did FROM rings WHERE uri = ?",
        )
            .bind(uri)
            .first()) as { owner_did: string } | null;

        if (!ring || ring.owner_did !== did) {
            return c.text("Unauthorized or ring not found", 403);
        }

        // 2. Delete from ATProto
        await AtProtoService.deleteRing(agent, uri);

        // 3. Delete owner's own member record from ATProto if exists
        const myMembership = (await c.env.DB.prepare(
            "SELECT member_uri FROM memberships m JOIN sites s ON m.site_id = s.id WHERE m.ring_uri = ? AND s.user_did = ?",
        )
            .bind(uri, did)
            .first()) as { member_uri: string } | null;

        if (myMembership) {
            console.log(
                `[Delete] Deleting owner's member record: ${myMembership.member_uri}`,
            );
            await AtProtoService.leaveRing(agent, myMembership.member_uri);
        }

        // 4. Delete from Local DB
        // Using batch to ensure atomicity for related data
        await c.env.DB.batch([
            c.env.DB.prepare("DELETE FROM memberships WHERE ring_uri = ?").bind(
                uri,
            ),
            c.env.DB.prepare(
                "DELETE FROM join_requests WHERE ring_uri = ?",
            ).bind(uri),
            c.env.DB.prepare(
                "DELETE FROM block_records WHERE ring_uri = ?",
            ).bind(uri),
            c.env.DB.prepare("DELETE FROM rings WHERE uri = ?").bind(uri),
        ]);
    } catch (e) {
        console.error("Error deleting ring:", e);
        return c.text("Failed to delete ring", 500);
    }

    return c.redirect("/dashboard?msg=deleted");
});

// GET /dashboard/ring/invite/friends
app.get("/invite/friends", async (c) => {
    const payload = c.get("jwtPayload");
    const did = payload.sub;
    try {
        const agent = await restoreAgent(c.env.DB as any, PUBLIC_URL, did);
        if (!agent) {
            return c.json({ success: false, error: "Unauthorized" }, 401);
        }

        const result = await AtProtoService.getFollowers(agent, did);

        return c.json({
            success: true,
            follows: result.followers,
        });
    } catch (e) {
        console.error("Error fetching follows:", e);
        return c.json(
            { success: false, error: (e as any).message || "Internal Error" },
            500,
        );
    }
});

export default app;
