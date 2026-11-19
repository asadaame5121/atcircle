import { beforeEach, describe, expect, it, vi } from "vitest";
import {
    createMockAuthToken,
    createMockDB,
    wrapApp,
} from "../../../tests/route-utils.js";
import { AtProtoService } from "../../services/atproto.js";
import { MembershipActions } from "../../services/membership-actions.js";
import { approvalNotifier } from "../../services/notification.js";
import * as oauth from "../../services/oauth.js";
import { publicRecords } from "../../services/public-records.js";
import dashboardApp from "../dashboard.js";

const OWNER = "did:plc:owner";
const RING = `at://${OWNER}/net.asadaame5121.at-circle.ring/3abc`;
const REQUEST = "at://did:plc:alice/net.asadaame5121.at-circle.request/1";

const post = async (
    did: string,
    path: string,
    form: Record<string, string>,
    first: unknown = null,
) => {
    const token = await createMockAuthToken(did, "user.test");
    const db = createMockDB({ first, all: [] });
    const res = await wrapApp(dashboardApp).request(
        `/ring${path}`,
        {
            method: "POST",
            headers: {
                Cookie: `session=${token}`,
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams(form),
        },
        { DB: db },
    );
    const writes = (db.prepare as any).mock.calls
        .map((c: any[]) => c[0] as string)
        .filter((q: string) => /^\s*(UPDATE|DELETE|INSERT)/i.test(q));
    const batched = (db as any).batch?.mock?.calls?.length ?? 0;
    return { res, writes, batched };
};

describe("承認・拒否は decision レコードを PDS に書く", () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        vi.spyOn(oauth, "restoreAgent").mockResolvedValue({
            assertDid: OWNER,
        } as any);
        vi.spyOn(MembershipActions, "decide").mockResolvedValue(undefined);
        vi.spyOn(publicRecords, "getRecord").mockResolvedValue({
            uri: RING,
            cid: "c",
            value: { admin: OWNER },
        });
        vi.spyOn(AtProtoService, "unblock").mockResolvedValue(undefined);
    });

    it("PDS 上の申請 (ring_uri + subject_uri) を承認できる", async () => {
        const { res } = await post(OWNER, "/request/approve", {
            ring_uri: RING,
            subject_uri: REQUEST,
        });
        expect(res.status).toBe(302);
        expect(res.headers.get("Location")).toContain("msg=approved");
        expect(MembershipActions.decide).toHaveBeenCalledWith(
            expect.anything(),
            RING,
            REQUEST,
            "approved",
        );
    });

    it("従来の request_id でも承認できる (DB の行から対象を引く)", async () => {
        const row = {
            id: 7,
            ring_uri: RING,
            user_did: "did:plc:alice",
            site_url: "https://alice.test/",
            site_title: "Alice",
            rss_url: null,
            atproto_uri: REQUEST,
        };
        const { res } = await post(
            OWNER,
            "/request/approve",
            { request_id: "7" },
            row,
        );
        expect(res.status).toBe(302);
        expect(MembershipActions.decide).toHaveBeenCalledWith(
            expect.anything(),
            RING,
            REQUEST,
            "approved",
        );
    });

    it("拒否は removed を書く", async () => {
        await post(OWNER, "/request/reject", {
            ring_uri: RING,
            subject_uri: REQUEST,
        });
        expect(MembershipActions.decide).toHaveBeenCalledWith(
            expect.anything(),
            RING,
            REQUEST,
            "removed",
        );
    });

    it("管理者でなければ 403", async () => {
        const { res } = await post("did:plc:mallory", "/request/approve", {
            ring_uri: RING,
            subject_uri: REQUEST,
        });
        expect(res.status).toBe(403);
        expect(MembershipActions.decide).not.toHaveBeenCalled();
    });

    it("対象がこのリングの参加レコードでなければ 400", async () => {
        const { res } = await post(OWNER, "/request/approve", {
            ring_uri: RING,
            subject_uri: "at://did:plc:alice/app.bsky.feed.post/1",
        });
        expect(res.status).toBe(400);
        expect(MembershipActions.decide).not.toHaveBeenCalled();
    });

    it("PDS への書き込みに失敗したら DB を変えずに 502", async () => {
        vi.mocked(MembershipActions.decide).mockRejectedValueOnce(
            new Error("scope"),
        );
        const { res, writes, batched } = await post(OWNER, "/request/approve", {
            ring_uri: RING,
            subject_uri: REQUEST,
        });
        expect(res.status).toBe(502);
        expect(writes).toHaveLength(0);
        expect(batched).toBe(0);
    });

    it("他人のブロックレコードは解除できない", async () => {
        const { res } = await post(OWNER, "/unblock", {
            uri: "at://did:plc:someone/net.asadaame5121.at-circle.block/1",
        });
        expect(res.status).toBe(403);
        expect(AtProtoService.unblock).not.toHaveBeenCalled();
    });
});

describe("承認したら申請者に Bluesky で通知する", () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        vi.spyOn(oauth, "restoreAgent").mockResolvedValue({
            assertDid: OWNER,
        } as any);
        vi.spyOn(MembershipActions, "decide").mockResolvedValue(undefined);
        vi.spyOn(publicRecords, "getRecord").mockResolvedValue({
            uri: RING,
            cid: "c",
            value: { admin: OWNER },
        });
        vi.spyOn(approvalNotifier, "notifyApproval").mockResolvedValue(true);
    });

    it("承認すると、申請レコードの持ち主にリング名つきで通知する", async () => {
        const { res } = await post(
            OWNER,
            "/request/approve",
            { ring_uri: RING, subject_uri: REQUEST },
            { title: "個人サイトの集い" },
        );
        expect(res.status).toBe(302);
        expect(approvalNotifier.notifyApproval).toHaveBeenCalledWith({
            subjectDid: "did:plc:alice",
            ringUri: RING,
            ringTitle: "個人サイトの集い",
        });
    });

    it("拒否では通知しない", async () => {
        await post(OWNER, "/request/reject", {
            ring_uri: RING,
            subject_uri: REQUEST,
        });
        expect(approvalNotifier.notifyApproval).not.toHaveBeenCalled();
    });

    it("通知に失敗しても承認は完了する", async () => {
        vi.spyOn(approvalNotifier, "notifyApproval").mockRejectedValue(
            new Error("boom"),
        );
        const { res } = await post(OWNER, "/request/approve", {
            ring_uri: RING,
            subject_uri: REQUEST,
        });
        expect(res.status).toBe(302);
        expect(res.headers.get("Location")).toContain("msg=approved");
    });
});
