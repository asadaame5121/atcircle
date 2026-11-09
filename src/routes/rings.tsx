import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { Layout } from "../components/Layout.js";
import { RingDetailView } from "../components/RingDetailView.js";
import { RingListView } from "../components/RingListView.js";
import { toNavigationMembers } from "../lib/navigation-session.js";
import { RingRepository } from "../repositories/ring.repository.js";
import { ringQuerySchema } from "../schemas/index.js";
import { AtProtoService } from "../services/atproto.js";
import { generateOpml } from "../services/opml.js";
import { findRing, refreshRingCache } from "../services/ring-cache.js";
import { getApprovedMembers } from "../services/ring-members.js";
import type { AppVariables, Bindings } from "../types/bindings.js";

const app = new Hono<{ Bindings: Bindings; Variables: AppVariables }>();

// List all rings
app.get("/", async (c) => {
    const t = c.get("t");
    const lang = c.get("lang");
    const ringRepo = new RingRepository(c.env.DB);
    const rings = await ringRepo.getAllWithMemberCount({ onlyOpen: true });

    // Resolve owner DIDs to handles (best-effort; fall back to short DID)
    const ownerLabels: Record<string, string> = {};
    try {
        const dids = [
            ...new Set(rings.map((r) => r.owner_did).filter(Boolean)),
        ];
        if (dids.length > 0) {
            const profiles = await AtProtoService.getProfilesPublic(dids);
            for (const p of profiles.profiles) {
                ownerLabels[p.did] = p.displayName || p.handle || p.did;
            }
        }
    } catch {
        // Keep raw DIDs on profile resolution failure
    }

    return c.html(
        Layout({
            title: t("rings.explore_title"),
            t,
            current: "rings",
            lang,
            children: RingListView({ rings, ownerLabels, t }),
        }),
    );
});

// View sites in a specific ring
app.get("/view", zValidator("query", ringQuerySchema), async (c) => {
    const {
        ring: rawRingUri,
        slug,
        member: initialMemberUri,
    } = c.req.valid("query");
    const t = c.get("t");
    const lang = c.get("lang");

    let ring = await findRing(c.env.DB, { uri: rawRingUri, slug });
    if (!ring) return c.redirect("/rings");

    const ringUri = ring.uri;
    const { members, ring: pdsRing } = await getApprovedMembers(
        c.env.DB,
        ringUri,
    );
    if (pdsRing) ring = await refreshRingCache(c.env.DB, ring, pdsRing);

    return c.html(
        Layout({
            title: `${ring.title} - Site List`,
            t,
            current: "rings",
            lang,
            ogImage: ring.banner_url || undefined,
            children: RingDetailView({
                ring,
                members,
                ringUri,
                initialMemberUri,
                t,
            }),
        }),
    );
});

// Companion Navigation route (standalone compact UI)
app.get("/companion", zValidator("query", ringQuerySchema), async (c) => {
    const {
        ring: rawRingUri,
        slug,
        member: initialMemberUri,
    } = c.req.valid("query");
    const t = c.get("t");
    const lang = c.get("lang") || "ja";

    let ring = await findRing(c.env.DB, { uri: rawRingUri, slug });
    if (!ring) return c.redirect("/rings");

    const ringUri = ring.uri;
    const { members: rawMembers, ring: pdsRing } = await getApprovedMembers(
        c.env.DB,
        ringUri,
    );
    if (pdsRing) ring = await refreshRingCache(c.env.DB, ring, pdsRing);
    const members = toNavigationMembers(rawMembers);

    const { CompanionView } = await import("../components/CompanionView.js");

    return c.html(
        CompanionView({
            ring,
            members,
            initialMemberUri,
            lang,
            t,
        }),
    );
});

// Export OPML for a specific ring
app.get("/opml", zValidator("query", ringQuerySchema), async (c) => {
    const { ring: ringUri } = c.req.valid("query");
    if (!ringUri) return c.text("Missing ring URI", 400);

    const ring = await findRing(c.env.DB, { uri: ringUri });
    const { members: approved } = await getApprovedMembers(c.env.DB, ringUri);
    const members = approved.filter((m) => !!m.rss_url);

    const opml = generateOpml({
        title: ring ? `${ring.title} Members` : "AT CIRCLE Members",
        outlines: members.map((m) => ({
            text: m.title,
            title: m.title,
            type: "rss",
            xmlUrl: m.rss_url || "",
            htmlUrl: m.url,
            description: m.description || "",
        })),
    });

    c.header("Content-Type", "text/x-opml+xml");
    c.header(
        "Content-Disposition",
        `attachment; filename="ring-${encodeURIComponent(ring?.title || "members")}.opml"`,
    );
    return c.body(opml);
});

export default app;
