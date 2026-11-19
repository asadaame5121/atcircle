import { beforeEach, describe, expect, it, vi } from "vitest";
import { AtProtoService } from "./atproto.js";
import { buildApprovalPost, createApprovalNotifier } from "./notification.js";

const RING = "at://did:plc:owner/net.asadaame5121.at-circle.ring/3abc";
const WIDGET_URL = `https://at-circle.example/dashboard/ring/widget?ring_uri=${encodeURIComponent(RING)}`;

const bytes = (s: string) => new TextEncoder().encode(s);
const slice = (text: string, start: number, end: number) =>
    new TextDecoder().decode(bytes(text).slice(start, end));

describe("buildApprovalPost（承認通知の本文）", () => {
    const post = buildApprovalPost({
        handle: "alice.example.com",
        did: "did:plc:alice",
        ringTitle: "個人サイトの集い",
        widgetUrl: WIDGET_URL,
    });

    it("相手へのメンションとリング名を含む", () => {
        expect(post.text.startsWith("@alice.example.com ")).toBe(true);
        expect(post.text).toContain(
            "「個人サイトの集い」への参加が承認されました",
        );
    });

    it("メンションの範囲はバイト単位で @ハンドル を指し、DID に結びつく", () => {
        const mention = post.facets.find(
            (f) => f.features[0].$type === "app.bsky.richtext.facet#mention",
        );
        expect(mention?.features[0]).toMatchObject({ did: "did:plc:alice" });
        expect(
            slice(
                post.text,
                mention?.index.byteStart ?? 0,
                mention?.index.byteEnd ?? 0,
            ),
        ).toBe("@alice.example.com");
    });

    it("日本語の後ろにあるリンクも、バイト単位でウィジェット画面を指す", () => {
        const link = post.facets.find(
            (f) => f.features[0].$type === "app.bsky.richtext.facet#link",
        );
        expect(link?.features[0]).toMatchObject({ uri: WIDGET_URL });
        expect(
            slice(
                post.text,
                link?.index.byteStart ?? 0,
                link?.index.byteEnd ?? 0,
            ),
        ).toBe("ウィジェットを取得 ≫");
    });

    it("長いリング名は300字に収まるよう切り詰める", () => {
        const long = buildApprovalPost({
            handle: "alice.example.com",
            did: "did:plc:alice",
            ringTitle: "あ".repeat(400),
            widgetUrl: WIDGET_URL,
        });
        expect([...long.text].length).toBeLessThanOrEqual(300);
        expect(long.text).toContain("…」");
        const link = long.facets.find(
            (f) => f.features[0].$type === "app.bsky.richtext.facet#link",
        );
        expect(
            slice(
                long.text,
                link?.index.byteStart ?? 0,
                link?.index.byteEnd ?? 0,
            ),
        ).toBe("ウィジェットを取得 ≫");
    });
});

describe("createApprovalNotifier（公式アカウントからの通知）", () => {
    const login = vi.fn();
    const postFn = vi.fn();
    const agentFactory = vi.fn(() => ({ login, post: postFn }) as any);

    beforeEach(() => {
        vi.restoreAllMocks();
        login.mockReset().mockResolvedValue(undefined);
        postFn.mockReset().mockResolvedValue({ uri: "at://post/1" });
        agentFactory.mockClear();
        vi.spyOn(AtProtoService, "getProfilesPublic").mockResolvedValue({
            profiles: [{ did: "did:plc:alice", handle: "alice.example.com" }],
        });
    });

    const notifier = (password?: string) =>
        createApprovalNotifier({
            identifier: "atcircle.bsky.social",
            password,
            service: "https://bsky.social",
            publicUrl: "https://at-circle.example",
            agentFactory,
        });

    it("アプリパスワードが未設定なら何もしない", async () => {
        const n = notifier(undefined);
        expect(n.enabled).toBe(false);
        expect(
            await n.notifyApproval({
                subjectDid: "did:plc:alice",
                ringUri: RING,
                ringTitle: "R",
            }),
        ).toBe(false);
        expect(agentFactory).not.toHaveBeenCalled();
    });

    it("公式アカウントでログインしてメンション付きで投稿する", async () => {
        const n = notifier("app-pass");
        expect(n.enabled).toBe(true);
        const ok = await n.notifyApproval({
            subjectDid: "did:plc:alice",
            ringUri: RING,
            ringTitle: "個人サイトの集い",
        });
        expect(ok).toBe(true);
        expect(login).toHaveBeenCalledWith({
            identifier: "atcircle.bsky.social",
            password: "app-pass",
        });
        const arg = postFn.mock.calls[0][0];
        expect(arg.text).toContain("@alice.example.com");
        expect(arg.langs).toEqual(["ja"]);
        expect(JSON.stringify(arg.facets)).toContain(encodeURIComponent(RING));
    });

    it("2回目以降はログインし直さない", async () => {
        const n = notifier("app-pass");
        const req = {
            subjectDid: "did:plc:alice",
            ringUri: RING,
            ringTitle: "R",
        };
        await n.notifyApproval(req);
        await n.notifyApproval(req);
        expect(login).toHaveBeenCalledTimes(1);
        expect(postFn).toHaveBeenCalledTimes(2);
    });

    it("投稿に失敗したらログインし直して1回だけ再試行する", async () => {
        postFn
            .mockRejectedValueOnce(new Error("ExpiredToken"))
            .mockResolvedValueOnce({ uri: "at://post/2" });
        const n = notifier("app-pass");
        const ok = await n.notifyApproval({
            subjectDid: "did:plc:alice",
            ringUri: RING,
            ringTitle: "R",
        });
        expect(ok).toBe(true);
        expect(login).toHaveBeenCalledTimes(2);
        expect(postFn).toHaveBeenCalledTimes(2);
    });

    it("失敗しても例外を投げず false を返す（承認処理は止めない）", async () => {
        postFn.mockRejectedValue(new Error("down"));
        const n = notifier("app-pass");
        await expect(
            n.notifyApproval({
                subjectDid: "did:plc:alice",
                ringUri: RING,
                ringTitle: "R",
            }),
        ).resolves.toBe(false);
    });

    it("相手のハンドルが分からなければ投稿しない", async () => {
        vi.spyOn(AtProtoService, "getProfilesPublic").mockResolvedValue({
            profiles: [],
        });
        const n = notifier("app-pass");
        expect(
            await n.notifyApproval({
                subjectDid: "did:plc:alice",
                ringUri: RING,
                ringTitle: "R",
            }),
        ).toBe(false);
        expect(postFn).not.toHaveBeenCalled();
    });
});
