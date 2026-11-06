import { beforeEach, describe, expect, it, vi } from "vitest";
import {
    createMockAuthToken,
    createMockDB,
    wrapApp,
} from "../../../tests/route-utils.js";
import { MembershipActions } from "../../services/membership-actions.js";
import * as oauth from "../../services/oauth.js";
import { publicRecords } from "../../services/public-records.js";
import dashboardApp from "../dashboard.js";

const OWNER = "did:plc:owner";
const RING = `at://${OWNER}/net.asadaame5121.at-circle.ring/3abc`;
const SUBJECT = "at://did:plc:alice/net.asadaame5121.at-circle.member/1";

const post = async (
    did: string,
    path: string,
    form: Record<string, string>,
) => {
    const token = await createMockAuthToken(did, "user.test");
    const db = createMockDB({ first: null, all: [] });
    const res = await wrapApp(dashboardApp).request(
        `/ring/members${path}`,
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
        .filter((q: string) => /^\s*(UPDATE|DELETE)/i.test(q));
    return { res, writes };
};

describe("メンバー管理は decision レコードを PDS に書く", () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        vi.spyOn(oauth, "restoreAgent").mockResolvedValue({
            assertDid: OWNER,
        } as any);
        vi.spyOn(MembershipActions, "findSubjects").mockResolvedValue([
            SUBJECT,
        ]);
        vi.spyOn(MembershipActions, "decide").mockResolvedValue(undefined);
        vi.spyOn(MembershipActions, "reset").mockResolvedValue(undefined);
        // 管理者でない DID の判定用: リングレコードの admin は所有者
        vi.spyOn(publicRecords, "getRecord").mockResolvedValue({
            uri: RING,
            cid: "c",
            value: { admin: OWNER },
        });
    });

    it("キックは removed の decision を書き、DB からも消す", async () => {
        const { res, writes } = await post(OWNER, "/kick", {
            ring_uri: RING,
            member_did: "did:plc:alice",
        });
        expect(res.status).toBe(200);
        expect(MembershipActions.decide).toHaveBeenCalledWith(
            expect.anything(),
            RING,
            SUBJECT,
            "removed",
        );
        expect(
            writes.some((q: string) => /DELETE FROM memberships/.test(q)),
        ).toBe(true);
    });

    it("一時停止は suspended、承認は approved の decision を書く", async () => {
        await post(OWNER, "/update", {
            ring_uri: RING,
            member_did: "did:plc:alice",
            status: "suspended",
        });
        expect(MembershipActions.decide).toHaveBeenLastCalledWith(
            expect.anything(),
            RING,
            SUBJECT,
            "suspended",
        );

        await post(OWNER, "/update", {
            ring_uri: RING,
            member_did: "did:plc:alice",
            status: "approved",
        });
        expect(MembershipActions.decide).toHaveBeenLastCalledWith(
            expect.anything(),
            RING,
            SUBJECT,
            "approved",
        );
    });

    it("保留に戻すときは decision を取り消す", async () => {
        await post(OWNER, "/update", {
            ring_uri: RING,
            member_did: "did:plc:alice",
            status: "pending",
        });
        expect(MembershipActions.reset).toHaveBeenCalledWith(
            expect.anything(),
            RING,
            SUBJECT,
        );
        expect(MembershipActions.decide).not.toHaveBeenCalled();
    });

    it("PDS への書き込みに失敗したら DB は変えずにエラーを返す", async () => {
        vi.mocked(MembershipActions.decide).mockRejectedValueOnce(
            new Error("scope missing"),
        );
        const { res, writes } = await post(OWNER, "/kick", {
            ring_uri: RING,
            member_did: "did:plc:alice",
        });
        expect(res.status).toBe(502);
        expect(writes).toHaveLength(0);
    });

    it("管理者でなければ何もしない", async () => {
        const { res } = await post("did:plc:mallory", "/kick", {
            ring_uri: RING,
            member_did: "did:plc:alice",
        });
        expect(res.status).toBe(403);
        expect(MembershipActions.decide).not.toHaveBeenCalled();
    });
});
