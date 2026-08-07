import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { Layout } from "../components/Layout.js";
import { RingDetailView } from "../components/RingDetailView.js";
import { RingListView } from "../components/RingListView.js";
import { MemberRepository } from "../repositories/member.repository.js";
import { RingRepository } from "../repositories/ring.repository.js";
import { ringQuerySchema } from "../schemas/index.js";
import { AtProtoService } from "../services/atproto.js";
import { generateOpml } from "../services/opml.js";
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
            lang,
            children: RingListView({ rings, ownerLabels, t }),
        }),
    );
});

// View sites in a specific ring
app.get("/view", zValidator("query", ringQuerySchema), async (c) => {
    const { ring: ringUri } = c.req.valid("query");
    const t = c.get("t");
    const lang = c.get("lang");

    if (!ringUri) return c.redirect("/rings");

    const ringRepo = new RingRepository(c.env.DB);
    const memberRepo = new MemberRepository(c.env.DB);

    // Fetch ring info
    const ring = await ringRepo.findByUri(ringUri);
    if (!ring) return c.redirect("/rings");

    // Fetch members
    const members = await memberRepo.findApprovedMembersByRing(ringUri);

    return c.html(
        Layout({
            title: `${ring.title} - Site List`,
            t,
            lang,
            ogImage: ring.banner_url || undefined,
            children: RingDetailView({
                ring,
                members,
                ringUri,
                t,
            }),
        }),
    );
});

// Export OPML for a specific ring
app.get("/opml", zValidator("query", ringQuerySchema), async (c) => {
    const { ring: ringUri } = c.req.valid("query");
    if (!ringUri) return c.text("Missing ring URI", 400);

    const ringRepo = new RingRepository(c.env.DB);
    const memberRepo = new MemberRepository(c.env.DB);

    const ring = await ringRepo.findByUri(ringUri);
    const members = await memberRepo.findMembersForOpml(ringUri);

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
