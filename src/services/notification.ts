import { AtpAgent } from "@atproto/api";
import {
    NOTIFY_APP_PASSWORD,
    NOTIFY_HANDLE,
    NOTIFY_SERVICE,
    PUBLIC_URL,
} from "../config.js";
import { logger as pinoLogger } from "../lib/logger.js";
import { AtProtoService } from "./atproto.js";

type Facet = {
    index: { byteStart: number; byteEnd: number };
    features: (
        | { $type: "app.bsky.richtext.facet#mention"; did: string }
        | { $type: "app.bsky.richtext.facet#link"; uri: string }
    )[];
};

const MAX_GRAPHEMES = 300;
const LINK_TEXT = "ウィジェットを取得 ≫";

const byteLength = (s: string) => new TextEncoder().encode(s).length;

/**
 * 承認通知の投稿本文とリッチテキスト（メンション・リンク）を作る。
 * 例：「@alice.example.com 「個人サイトの集い」への参加が承認されました！ ウィジェットを取得 ≫」
 */
export function buildApprovalPost(params: {
    handle: string;
    did: string;
    ringTitle: string;
    widgetUrl: string;
}): { text: string; facets: Facet[] } {
    const mention = `@${params.handle}`;
    const compose = (title: string) =>
        `${mention} 「${title}」への参加が承認されました！ `;

    let title = params.ringTitle;
    // 300字（書記素）に収まるようリング名を切り詰める
    const budget =
        MAX_GRAPHEMES - [...compose("")].length - [...LINK_TEXT].length;
    const chars = [...title];
    if (chars.length > budget) {
        title = `${chars.slice(0, Math.max(budget - 1, 0)).join("")}…`;
    }

    const head = compose(title);
    const text = `${head}${LINK_TEXT}`;
    const linkStart = byteLength(head);

    return {
        text,
        facets: [
            {
                index: { byteStart: 0, byteEnd: byteLength(mention) },
                features: [
                    {
                        $type: "app.bsky.richtext.facet#mention",
                        did: params.did,
                    },
                ],
            },
            {
                index: {
                    byteStart: linkStart,
                    byteEnd: linkStart + byteLength(LINK_TEXT),
                },
                features: [
                    {
                        $type: "app.bsky.richtext.facet#link",
                        uri: params.widgetUrl,
                    },
                ],
            },
        ],
    };
}

type PostingAgent = Pick<AtpAgent, "login" | "post">;

export type ApprovalRequest = {
    subjectDid: string;
    ringUri: string;
    ringTitle: string;
};

/**
 * 公式アカウント（既定 atcircle.bsky.social）から、承認された人へメンションで知らせる。
 * アプリパスワードが未設定なら何もしない。失敗しても例外は投げない（承認処理を止めない）。
 */
export function createApprovalNotifier(options: {
    identifier: string;
    password?: string;
    service: string;
    publicUrl: string;
    agentFactory?: (service: string) => PostingAgent;
}) {
    const factory =
        options.agentFactory ??
        ((service: string) => new AtpAgent({ service }));
    let agent: PostingAgent | null = null;

    const login = async () => {
        const next = factory(options.service);
        await next.login({
            identifier: options.identifier,
            password: options.password as string,
        });
        agent = next;
        return next;
    };

    return {
        enabled: !!options.password,
        handle: options.identifier,

        async notifyApproval(req: ApprovalRequest): Promise<boolean> {
            if (!options.password) return false;
            try {
                const { profiles } = await AtProtoService.getProfilesPublic([
                    req.subjectDid,
                ]);
                const handle = profiles.find(
                    (p: any) => p.did === req.subjectDid,
                )?.handle;
                if (!handle || handle === "handle.invalid") {
                    pinoLogger.warn({
                        msg: "[Notify] Handle not found; skip",
                        did: req.subjectDid,
                    });
                    return false;
                }

                const { text, facets } = buildApprovalPost({
                    handle,
                    did: req.subjectDid,
                    ringTitle: req.ringTitle,
                    widgetUrl: `${options.publicUrl}/dashboard/ring/widget?ring_uri=${encodeURIComponent(req.ringUri)}`,
                });
                const record = {
                    text,
                    facets,
                    langs: ["ja"],
                    createdAt: new Date().toISOString(),
                };

                const current = agent ?? (await login());
                try {
                    await current.post(record);
                } catch (e) {
                    // セッション切れなどに備えて、ログインし直して1回だけ再試行
                    pinoLogger.warn({
                        msg: "[Notify] Retry after re-login",
                        error: e,
                    });
                    await (await login()).post(record);
                }
                pinoLogger.info({
                    msg: "[Notify] Approval notification sent",
                    did: req.subjectDid,
                    ringUri: req.ringUri,
                });
                return true;
            } catch (e) {
                pinoLogger.error({
                    msg: "[Notify] Approval notification failed",
                    did: req.subjectDid,
                    error: e,
                });
                return false;
            }
        },
    };
}

export const approvalNotifier = createApprovalNotifier({
    identifier: NOTIFY_HANDLE,
    password: NOTIFY_APP_PASSWORD,
    service: NOTIFY_SERVICE,
    publicUrl: PUBLIC_URL,
});
