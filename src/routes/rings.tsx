import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { CreateView } from "../components/CreateView.js";
import { FindView, RecentTicker } from "../components/FindView.js";
import { Layout } from "../components/Layout.js";
import { RingDetailView } from "../components/RingDetailView.js";
import { logger as pinoLogger } from "../lib/logger.js";
import { toNavigationMembers } from "../lib/navigation-session.js";
import { getOptionalSession } from "../middleware/auth.js";
import { RingRepository } from "../repositories/ring.repository.js";
import { ringQuerySchema } from "../schemas/index.js";
import {
    filterRings,
    getJoinContext,
    getMySite,
    getRecentActivity,
    type JoinContext,
    type RecentActivity,
} from "../services/find-rings.js";
import { generateOpml } from "../services/opml.js";
import { findRing, refreshRingCache } from "../services/ring-cache.js";
import { getApprovedMembers } from "../services/ring-members.js";
import type { AppVariables, Bindings } from "../types/bindings.js";

const app = new Hono<{ Bindings: Bindings; Variables: AppVariables }>();

// リングを探す（一覧・検索・選んだリングへの参加）
app.get("/", async (c) => {
    const t = c.get("t");
    const lang = c.get("lang");
    const q = (c.req.query("q") ?? "").slice(0, 100);
    const selectedUri = c.req.query("select") || undefined;

    const ringRepo = new RingRepository(c.env.DB);
    const all = await ringRepo.getAllWithMemberCount({ onlyOpen: true });
    const rings = filterRings(
        [...all].sort((a, b) => (b.member_count ?? 0) - (a.member_count ?? 0)),
        q,
    );

    const session = await getOptionalSession(c);
    const selected = selectedUri
        ? rings.find((r) => r.uri === selectedUri)
        : undefined;
    let join: JoinContext | null = null;
    if (session && selected) {
        try {
            join = await getJoinContext(c.env.DB, session.sub, selected.uri);
        } catch (e) {
            pinoLogger.error({ msg: "Join context load failed", error: e });
        }
    }

    let recent: RecentActivity[] = [];
    try {
        recent = await getRecentActivity(c.env.DB);
    } catch (e) {
        pinoLogger.error({ msg: "Recent activity load failed", error: e });
    }

    return c.html(
        Layout({
            title: t("rings.explore_title"),
            t,
            current: "rings",
            lang,
            ticker: RecentTicker({ items: recent, t }),
            children: FindView({
                rings,
                q,
                selectedUri,
                loggedIn: !!session,
                join,
                t,
            }),
        }),
    );
});

// リングを立ち上げる（要ログイン）
app.get("/new", async (c) => {
    const session = await getOptionalSession(c);
    if (!session) {
        return c.redirect(`/login?next=${encodeURIComponent("/rings/new")}`);
    }
    const t = c.get("t");
    const lang = c.get("lang");

    let site: JoinContext["site"] = null;
    try {
        site = await getMySite(c.env.DB, session.sub);
    } catch (e) {
        pinoLogger.error({ msg: "Site load failed", error: e });
    }

    return c.html(
        Layout({
            title: t("create.page_title"),
            t,
            current: "rings",
            lang,
            children: CreateView({ site, t }),
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
