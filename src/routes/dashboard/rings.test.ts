import { beforeEach, describe, expect, it, vi } from "vitest";
import {
    createMockAuthToken,
    createMockDB,
    wrapApp,
} from "../../../tests/route-utils.js";
import { AtProtoService } from "../../services/atproto.js";
import * as oauth from "../../services/oauth.js";
import dashboardApp from "../dashboard.js";

const VICTIM_RING = "at://did:plc:victim/net.asadaame5121.at-circle.ring/3abc";
const OWN_RING = "at://did:plc:owner/net.asadaame5121.at-circle.ring/3own";

const updateForm = (uri: string, adminDid: string) =>
    new URLSearchParams({
        uri,
        title: "Ring",
        description: "",
        status: "open",
        acceptance_policy: "manual",
        admin_did: adminDid,
        slug: "",
        banner_url: "",
    });

const postUpdate = async (
    did: string,
    body: URLSearchParams,
    first: unknown = null,
) => {
    const token = await createMockAuthToken(did, "user.test");
    const db = createMockDB({ first, all: [] });
    const app = wrapApp(dashboardApp);
    const res = await app.request(
        "/ring/update",
        {
            method: "POST",
            headers: {
                Cookie: `session=${token}`,
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body,
        },
        { DB: db },
    );
    const queries = (db.prepare as any).mock.calls.map((c: any[]) => c[0]);
    return { res, queries };
};

describe("POST /dashboard/ring/update", () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        vi.spyOn(oauth, "restoreAgent").mockResolvedValue({} as any);
        vi.spyOn(AtProtoService, "updateRing").mockResolvedValue(undefined);
    });

    it("他人のリングは更新できない (admin_did の乗っ取りを防ぐ)", async () => {
        const { res, queries } = await postUpdate(
            "did:plc:attacker",
            updateForm(VICTIM_RING, "did:plc:attacker"),
        );

        expect(res.status).toBe(403);
        expect(AtProtoService.updateRing).not.toHaveBeenCalled();
        expect(queries.some((q: string) => /UPDATE\s+rings/i.test(q))).toBe(
            false,
        );
    });

    it("所有者は自分のリングを更新できる", async () => {
        const { res, queries } = await postUpdate(
            "did:plc:owner",
            updateForm(OWN_RING, "did:plc:owner"),
        );

        expect(res.status).toBe(302);
        expect(res.headers.get("Location")).toContain("msg=updated");
        expect(AtProtoService.updateRing).toHaveBeenCalledOnce();
        expect(queries.some((q: string) => /UPDATE\s+rings/i.test(q))).toBe(
            true,
        );
    });

    it("不正な AT URI は拒否する", async () => {
        const { res } = await postUpdate(
            "did:plc:owner",
            updateForm("not-an-at-uri", "did:plc:owner"),
        );
        expect(res.status).toBe(400);
        expect(AtProtoService.updateRing).not.toHaveBeenCalled();
    });

    it("DID 形式でない admin_did は拒否する", async () => {
        const { res } = await postUpdate(
            "did:plc:owner",
            updateForm(OWN_RING, "<script>"),
        );
        expect(res.status).toBe(400);
        expect(AtProtoService.updateRing).not.toHaveBeenCalled();
    });

    it("他のリングが使っている slug は PDS に書く前に拒否する", async () => {
        const body = updateForm(OWN_RING, "did:plc:owner");
        body.set("slug", "taken");
        // isSlugTaken の問い合わせにヒットさせる
        const { res } = await postUpdate("did:plc:owner", body, { 1: 1 });

        expect(res.status).toBe(302);
        expect(res.headers.get("Location")).toContain("msg=slug_taken");
        expect(AtProtoService.updateRing).not.toHaveBeenCalled();
    });
});

describe("POST /dashboard/ring/leave", () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        vi.spyOn(oauth, "restoreAgent").mockResolvedValue({} as any);
        vi.spyOn(AtProtoService, "leaveRing").mockResolvedValue(undefined);
    });

    const leave = async (did: string, uri: string) => {
        const token = await createMockAuthToken(did, "user.test");
        const db = createMockDB({ first: null, all: [] });
        const res = await wrapApp(dashboardApp).request(
            "/ring/leave",
            {
                method: "POST",
                headers: {
                    Cookie: `session=${token}`,
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                body: new URLSearchParams({ uri }),
            },
            { DB: db },
        );
        const deletes = (db.prepare as any).mock.calls
            .map((c: any[]) => c[0] as string)
            .filter((q: string) => /DELETE/i.test(q));
        return { res, deletes };
    };

    it("他人の参加は取り消せない", async () => {
        const { res, deletes } = await leave(
            "did:plc:mallory",
            "at://did:plc:alice/net.asadaame5121.at-circle.member/1",
        );
        expect(res.status).toBe(403);
        expect(AtProtoService.leaveRing).not.toHaveBeenCalled();
        expect(deletes).toHaveLength(0);
    });

    it("自分の参加は取り消せる", async () => {
        const { res } = await leave(
            "did:plc:alice",
            "at://did:plc:alice/net.asadaame5121.at-circle.request/1",
        );
        expect(res.status).toBe(302);
        expect(AtProtoService.leaveRing).toHaveBeenCalledOnce();
    });
});

describe("POST /dashboard/ring/join", () => {
    const RING = "at://did:plc:owner/net.asadaame5121.at-circle.ring/3own";

    beforeEach(() => {
        vi.restoreAllMocks();
        vi.spyOn(oauth, "restoreAgent").mockResolvedValue({} as any);
        vi.spyOn(AtProtoService, "getRing").mockResolvedValue({
            value: { title: "Ring", acceptancePolicy: "automatic" },
        } as any);
        vi.spyOn(AtProtoService, "joinRing").mockResolvedValue(
            "at://did:plc:me/net.asadaame5121.at-circle.member/1",
        );
    });

    const join = async (site: { id: number } | null) => {
        const token = await createMockAuthToken("did:plc:me", "me.test");
        let siteRow = site;
        const db = createMockDB({
            first: (query: string) => {
                if (query.includes("SELECT id FROM sites")) return siteRow;
                return null;
            },
            all: [],
        });
        const prepare = db.prepare as any;
        const original = prepare.getMockImplementation();
        prepare.mockImplementation((query: string) => {
            const stmt = original(query);
            if (/INSERT INTO sites/i.test(query)) siteRow = { id: 42 };
            return stmt;
        });
        const res = await wrapApp(dashboardApp).request(
            "/ring/join",
            {
                method: "POST",
                headers: {
                    Cookie: `session=${token}`,
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                body: new URLSearchParams({
                    ring_uri: RING,
                    url: "https://example.com",
                    title: "Example",
                    rss: "",
                }),
            },
            { DB: db },
        );
        const queries = prepare.mock.calls.map((c: any[]) => c[0] as string);
        return { res, queries };
    };

    it("サイト未登録なら入力されたサイトを登録してから参加を記録する", async () => {
        const { res, queries } = await join(null);
        expect(res.status).toBe(302);
        const siteInsert = queries.findIndex((q) =>
            /INSERT INTO sites/i.test(q),
        );
        const memberInsert = queries.findIndex((q) =>
            /INSERT OR IGNORE INTO memberships/i.test(q),
        );
        expect(siteInsert).toBeGreaterThanOrEqual(0);
        expect(memberInsert).toBeGreaterThan(siteInsert);
    });

    it("サイト登録済みなら登録し直さない", async () => {
        const { queries } = await join({ id: 7 });
        expect(queries.some((q) => /INSERT INTO sites/i.test(q))).toBe(false);
        expect(
            queries.some((q) => /INSERT OR IGNORE INTO memberships/i.test(q)),
        ).toBe(true);
    });
});
