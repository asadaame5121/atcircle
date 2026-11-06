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

const postUpdate = async (did: string, body: URLSearchParams) => {
    const token = await createMockAuthToken(did, "user.test");
    const db = createMockDB({ first: null, all: [] });
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
});
