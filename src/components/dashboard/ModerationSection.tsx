import { html } from "hono/html";
import { safeHref } from "../../lib/html.js";

/** PDS 由来の申請は ring_uri + subject_uri、DB の申請は request_id で送る */
const requestTargetFields = (jr: any) =>
    jr.subject_uri
        ? html`<input type="hidden" name="ring_uri" value="${jr.ring_uri}" />
               <input type="hidden" name="subject_uri" value="${jr.subject_uri}" />`
        : html`<input type="hidden" name="request_id" value="${jr.id}" />`;

const SiteLine = ({
    title,
    url,
    ringTitle,
}: {
    title: string;
    url: string;
    ringTitle: string;
}) => html`
    <div class="rt-mod-main">
        <span class="rt-ring-meta">${ringTitle}</span>
        <b>${title}</b>
        <a href="${safeHref(url, "#")}" target="_blank" rel="noopener noreferrer">${url}</a>
    </div>
`;

/** オーナー向け：参加申請・承認待ちメンバー・ブロック中の一覧 */
export const ModerationSection = (props: {
    joinRequests: any[];
    pendingMemberships: any[];
    blocks: any[];
    t: (key: string, options?: any) => string;
}) => {
    const { joinRequests, pendingMemberships, blocks, t } = props;

    if (
        joinRequests.length === 0 &&
        pendingMemberships.length === 0 &&
        blocks.length === 0
    ) {
        return html``;
    }

    const requestCount = joinRequests.length + pendingMemberships.length;

    return html`
        ${
            requestCount > 0
                ? html`
        <section id="requests" class="rt-box rt-mod" aria-labelledby="requests-title">
            <h2 id="requests-title" class="rt-box-title">${t("dash.requests_title")}（${requestCount}）</h2>
            ${joinRequests.map(
                (jr: any) => html`
                <div class="rt-mod-row">
                    ${SiteLine({ title: jr.site_title, url: jr.site_url, ringTitle: jr.ring_title })}
                    ${jr.message ? html`<p class="rt-mod-message">「${jr.message}」</p>` : ""}
                    <div class="rt-mod-actions">
                        <form action="/dashboard/ring/request/approve" method="POST">
                            ${requestTargetFields(jr)}
                            <button type="submit" class="rt-bevel rt-go">${t("dashboard.approve")}</button>
                        </form>
                        <form action="/dashboard/ring/request/reject" method="POST">
                            ${requestTargetFields(jr)}
                            <button type="submit" class="rt-bevel">${t("dashboard.reject")}</button>
                        </form>
                    </div>
                </div>
            `,
            )}
            ${pendingMemberships.map(
                (m: any) => html`
                <div class="rt-mod-row">
                    ${SiteLine({ title: m.site_title, url: m.site_url, ringTitle: m.ring_title })}
                    <div class="rt-mod-actions">
                        <form action="/dashboard/ring/approve" method="POST">
                            <input type="hidden" name="member_uri" value="${m.member_uri}" />
                            <button type="submit" class="rt-bevel rt-go">${t("dashboard.approve")}</button>
                        </form>
                        <form action="/dashboard/ring/reject" method="POST" data-confirm="${t("dashboard.confirm_reject")}">
                            <input type="hidden" name="member_uri" value="${m.member_uri}" />
                            <button type="submit" class="rt-bevel">${t("dashboard.reject")}</button>
                        </form>
                    </div>
                </div>
            `,
            )}
        </section>
        `
                : ""
        }
        ${
            blocks.length > 0
                ? html`
        <details class="rt-box rt-advanced">
            <summary class="rt-box-title">${t("dash.blocks_title")}（${blocks.length}）</summary>
            ${blocks.map(
                (b: any) => html`
                <div class="rt-mod-row">
                    <div class="rt-mod-main">
                        <span class="rt-ring-meta">${b.ring_title}</span>
                        <b>${b.user_handle || "Unknown"}</b>
                        <span class="rt-did">${b.subject_did}</span>
                    </div>
                    <div class="rt-mod-actions">
                        <form action="/dashboard/ring/unblock" method="POST">
                            <input type="hidden" name="uri" value="${b.uri}" />
                            <button type="submit" class="rt-bevel">${t("dash.unblock")}</button>
                        </form>
                    </div>
                </div>
            `,
            )}
        </details>
        `
                : ""
        }
    `;
};
