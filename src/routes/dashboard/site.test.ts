import { beforeEach, describe, expect, it, vi } from "vitest";
import {
    createMockAuthToken,
    createMockDB,
    wrapApp,
} from "../../../tests/route-utils.js";
import * as oauth from "../../services/oauth.js";
import { SiteService } from "../../services/site.service.js";
import dashboardApp from "../dashboard.js";

const ME = "did:plc:me";

const post = async (path: string, form: Record<string, string>) => {
    const token = await createMockAuthToken(ME, "me.test");
    const db = createMockDB({ first: null, all: [] });
    const res = await wrapApp(dashboardApp).request(
        `/site${path}`,
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
        .filter((q: string) => /^\s*(INSERT|UPDATE)/i.test(q));
    return { res, writes };
};

describe("サイト登録は PDS の site レコードに書く", () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        vi.spyOn(oauth, "restoreAgent").mockResolvedValue({
            assertDid: ME,
        } as any);
        vi.spyOn(SiteService.prototype, "saveMySite").mockResolvedValue(
            {} as any,
        );
    });

    it("登録は SiteService 経由で PDS に書く (プロフィールのリンクも記録)", async () => {
        const { res, writes } = await post("", {
            url: "https://me.test/",
            title: "Me",
            description: "about",
            rss_url: "https://me.test/feed",
            link_uri: "at://did:plc:me/app.bsky.actor.link/3abc",
            link_cid: "bafylink",
        });
        expect(res.status).toBe(302);
        expect(res.headers.get("Location")).toContain("msg=registered");
        expect(SiteService.prototype.saveMySite).toHaveBeenCalledWith(
            expect.anything(),
            ME,
            {
                url: "https://me.test/",
                title: "Me",
                description: "about",
                rss: "https://me.test/feed",
                link: {
                    uri: "at://did:plc:me/app.bsky.actor.link/3abc",
                    cid: "bafylink",
                },
            },
        );
        // DB への直接書き込みはしない (SiteService がキャッシュする)
        expect(writes).toHaveLength(0);
    });

    it("他人のリンクレコードは記録しない", async () => {
        await post("", {
            url: "https://me.test/",
            title: "Me",
            link_uri: "at://did:plc:other/app.bsky.actor.link/1",
            link_cid: "x",
        });
        const fields = vi.mocked(SiteService.prototype.saveMySite).mock
            .calls[0][2];
        expect(fields.link).toBeNull();
    });

    it("更新も SiteService 経由 (リンクは変えない)", async () => {
        const { res } = await post("/update", {
            url: "https://new.test/",
            title: "New",
            description: "",
            rss_url: "",
        });
        expect(res.status).toBe(302);
        expect(res.headers.get("Location")).toContain("msg=updated");
        const fields = vi.mocked(SiteService.prototype.saveMySite).mock
            .calls[0][2];
        expect(fields).toEqual({
            url: "https://new.test/",
            title: "New",
            description: null,
            rss: null,
        });
    });

    it("PDS に書けなければ 502 (ログインし直しを案内)", async () => {
        vi.mocked(SiteService.prototype.saveMySite).mockRejectedValueOnce(
            new Error("scope"),
        );
        const { res } = await post("", {
            url: "https://me.test/",
            title: "Me",
        });
        expect(res.status).toBe(502);
        expect(await res.text()).toContain("ログインし直して");
    });

    it("ログインが切れていればログイン画面へ", async () => {
        vi.mocked(oauth.restoreAgent).mockResolvedValueOnce(undefined);
        const { res } = await post("", {
            url: "https://me.test/",
            title: "Me",
        });
        expect(res.status).toBe(302);
        expect(res.headers.get("Location")).toContain("/login");
        expect(SiteService.prototype.saveMySite).not.toHaveBeenCalled();
    });
});
