import { zValidator } from "@hono/zod-validator";
import { type Context, Hono } from "hono";
import { PUBLIC_URL } from "../../config.js";
import { logger as pinoLogger } from "../../lib/logger.js";
import {
    moderationMemberActionSchema,
    requestActionSchema,
    unblockActionSchema,
} from "../../schemas/index.js";
import { AtProtoService } from "../../services/atproto.js";
import { MembershipActions } from "../../services/membership-actions.js";
import { restoreAgent } from "../../services/oauth.js";
import { isOwnedBy } from "../../services/ring.service.js";
import { canManageRing } from "../../services/ring-access.js";
import { ringIndex } from "../../services/ring-index.js";
import type { AppVariables, Bindings } from "../../types/bindings.js";

type Env = { Bindings: Bindings; Variables: AppVariables };
const app = new Hono<Env>();

const PDS_WRITE_ERROR =
    "PDS への書き込みに失敗しました。ログインし直してから再度お試しください。";

const MEMBERSHIP_SUBJECT =
    /^at:\/\/did:[a-z]+:[a-zA-Z0-9._:%-]+\/net\.asadaame5121\.at-circle\.(member|request)\/[a-zA-Z0-9._~:-]+$/;

interface Target {
    ringUri: string;
    subjectUri: string;
    /** 従来の DB の行 (あればキャッシュ更新に使う) */
    requestRow?: any;
    membershipId?: number;
}

/**
 * 承認・拒否の対象を決めて、PDS に decision を書き、成功したら
 * onCached で DB のキャッシュを更新する。
 */
async function decideAndRespond(
    c: Context<Env>,
    target: Target | null,
    status: "approved" | "removed",
    onCached: (target: Target) => Promise<void>,
) {
    const did = c.get("jwtPayload").sub;

    if (!target) return c.text("Request not found", 404);
    if (!MEMBERSHIP_SUBJECT.test(target.subjectUri)) {
        return c.text("Invalid membership record", 400);
    }
    if (!(await canManageRing(did, target.ringUri))) {
        return c.text("Unauthorized or request not found", 403);
    }

    const agent = await restoreAgent(c.env.DB, PUBLIC_URL, did);
    if (!agent) return c.redirect("/login");

    try {
        await MembershipActions.decide(
            agent,
            target.ringUri,
            target.subjectUri,
            status,
        );
    } catch (e) {
        pinoLogger.error({ msg: "Moderation failed (PDS)", error: e });
        return c.text(PDS_WRITE_ERROR, 502);
    }

    try {
        await onCached(target);
    } catch (e) {
        // PDS が正本なので、キャッシュの失敗はログだけ残す
        pinoLogger.error({ msg: "Moderation cache update failed", error: e });
    }

    return c.redirect(
        `/dashboard?msg=${status === "approved" ? "approved" : "rejected"}`,
    );
}

/** フォーム (ring_uri + subject_uri、または従来の request_id) から対象を決める */
async function requestTarget(
    db: D1Database,
    form: { request_id?: string; ring_uri?: string; subject_uri?: string },
): Promise<Target | null> {
    if (form.ring_uri && form.subject_uri) {
        const requestRow = await db
            .prepare(
                "SELECT * FROM join_requests WHERE ring_uri = ? AND atproto_uri = ?",
            )
            .bind(form.ring_uri, form.subject_uri)
            .first<any>();
        return {
            ringUri: form.ring_uri,
            subjectUri: form.subject_uri,
            requestRow: requestRow ?? undefined,
        };
    }
    if (form.request_id) {
        const row = await db
            .prepare("SELECT * FROM join_requests WHERE id = ?")
            .bind(form.request_id)
            .first<any>();
        if (!row?.atproto_uri) return null;
        return {
            ringUri: row.ring_uri,
            subjectUri: row.atproto_uri,
            requestRow: row,
        };
    }
    return null;
}

async function membershipTarget(
    db: D1Database,
    memberUri: string,
): Promise<Target | null> {
    const row = await db
        .prepare("SELECT id, ring_uri FROM memberships WHERE member_uri = ?")
        .bind(memberUri)
        .first<{ id: number; ring_uri: string }>();
    if (!row) return null;
    return {
        ringUri: row.ring_uri,
        subjectUri: memberUri,
        membershipId: row.id,
    };
}

// POST /dashboard/ring/request/approve
app.post(
    "/request/approve",
    zValidator("form", requestActionSchema),
    async (c) => {
        const target = await requestTarget(c.env.DB, c.req.valid("form"));
        return decideAndRespond(c, target, "approved", async (t) => {
            const row = t.requestRow;
            if (!row) return;

            // キャッシュ: 申請をメンバーとして登録する
            let site = await c.env.DB.prepare(
                "SELECT id FROM sites WHERE user_did = ?",
            )
                .bind(row.user_did)
                .first<{ id: number }>();
            if (!site) {
                const res = await c.env.DB.prepare(
                    "INSERT INTO sites (user_did, url, title, rss_url, is_active) VALUES (?, ?, ?, ?, 1)",
                )
                    .bind(
                        row.user_did,
                        row.site_url,
                        row.site_title,
                        row.rss_url,
                    )
                    .run();
                site = { id: Number(res.meta.last_row_id) };
            }
            await c.env.DB.prepare(
                "INSERT OR REPLACE INTO memberships (ring_uri, site_id, member_uri, status) VALUES (?, ?, ?, 'approved')",
            )
                .bind(t.ringUri, site.id, t.subjectUri)
                .run();
            await c.env.DB.prepare(
                "UPDATE join_requests SET status = 'approved' WHERE id = ?",
            )
                .bind(row.id)
                .run();
        });
    },
);

// POST /dashboard/ring/request/reject
app.post(
    "/request/reject",
    zValidator("form", requestActionSchema),
    async (c) => {
        const target = await requestTarget(c.env.DB, c.req.valid("form"));
        return decideAndRespond(c, target, "removed", async (t) => {
            if (!t.requestRow) return;
            await c.env.DB.prepare(
                "UPDATE join_requests SET status = 'rejected' WHERE id = ?",
            )
                .bind(t.requestRow.id)
                .run();
        });
    },
);

// POST /dashboard/ring/approve (DB 上で保留中のメンバー)
app.post(
    "/approve",
    zValidator("form", moderationMemberActionSchema),
    async (c) => {
        const { member_uri: memberUri } = c.req.valid("form");
        const target = await membershipTarget(c.env.DB, memberUri);
        return decideAndRespond(c, target, "approved", async (t) => {
            await c.env.DB.prepare(
                "UPDATE memberships SET status = 'approved' WHERE id = ?",
            )
                .bind(t.membershipId)
                .run();
        });
    },
);

// POST /dashboard/ring/reject (DB 上で保留中のメンバー)
app.post(
    "/reject",
    zValidator("form", moderationMemberActionSchema),
    async (c) => {
        const { member_uri: memberUri } = c.req.valid("form");
        const target = await membershipTarget(c.env.DB, memberUri);
        return decideAndRespond(c, target, "removed", async (t) => {
            await c.env.DB.prepare("DELETE FROM memberships WHERE id = ?")
                .bind(t.membershipId)
                .run();
        });
    },
);

// POST /dashboard/ring/unblock
app.post("/unblock", zValidator("form", unblockActionSchema), async (c) => {
    const payload = c.get("jwtPayload");
    const did = payload.sub;
    const { uri: blockUri } = c.req.valid("form");

    if (!blockUri) return c.text("Block URI required", 400);
    // ブロックレコードは作成した管理者のリポジトリにある
    if (!isOwnedBy(blockUri, did)) {
        return c.text("Unauthorized or block not found", 403);
    }

    try {
        const agent = await restoreAgent(c.env.DB, PUBLIC_URL, did);
        if (!agent) return c.redirect("/login");

        await AtProtoService.unblock(agent, blockUri);

        const row = await c.env.DB.prepare(
            "SELECT ring_uri FROM block_records WHERE uri = ?",
        )
            .bind(blockUri)
            .first<{ ring_uri: string }>();
        if (row?.ring_uri) ringIndex.invalidate(row.ring_uri);

        await c.env.DB.prepare("DELETE FROM block_records WHERE uri = ?")
            .bind(blockUri)
            .run();

        return c.redirect("/dashboard?msg=unblocked");
    } catch (e) {
        pinoLogger.error({ msg: "Error unblocking user", error: e });
        return c.text("Failed to unblock", 500);
    }
});

export default app;
