import { html } from "hono/html";

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

    return html`
        <div class="divider">${t("dashboard.moderation") || "Moderation"}</div>
        <div class="space-y-4 mb-8">
            <!-- Join Requests (New Lexicon) -->
            ${joinRequests.map(
                (jr: any) => html`
                <div class="card bg-warning/5 border border-warning/20 shadow-sm">
                    <div class="card-body p-4 flex-row justify-between items-center">
                        <div>
                            <div class="text-xs font-bold text-warning uppercase tracking-wider mb-1">${t("dashboard.join_request_for", { ring_title: jr.ring_title }) || `Join Request for ${jr.ring_title}`}</div>
                            <div class="font-bold">${jr.site_title}</div>
                            <div class="text-xs opacity-60 underline"><a href="${jr.site_url}" target="_blank">${jr.site_url}</a></div>
                            ${jr.message ? html`<p class="text-sm mt-2 p-2 bg-base-100 rounded italic">"${jr.message}"</p>` : ""}
                            <div class="text-[10px] opacity-40 mt-1">From: ${jr.user_did}</div>
                        </div>
                        <div class="flex flex-col gap-2">
                            <form action="/dashboard/ring/request/approve" method="POST">
                                <input type="hidden" name="request_id" value="${jr.id}" />
                                <button type="submit" class="btn btn-success btn-sm w-full">${t("dashboard.approve")}</button>
                            </form>
                            <form action="/dashboard/ring/request/reject" method="POST">
                                <input type="hidden" name="request_id" value="${jr.id}" />
                                <button type="submit" class="btn btn-ghost btn-xs text-error w-full">${t("dashboard.reject")}</button>
                            </form>
                        </div>
                    </div>
                </div>
            `,
            )}

            <!-- Pending Memberships (Legacy/Direct) -->
            ${pendingMemberships.map(
                (m: any) => html`
                <div class="alert bg-base-200 border-warning/30 flex justify-between items-center py-3">
                    <div class="flex flex-col gap-0.5">
                        <div class="text-xs font-bold text-warning uppercase tracking-tighter">${t("dashboard.membership_approval_for", { ring_title: m.ring_title }) || `Pending Membership for ${m.ring_title}`}</div>
                        <div class="font-medium">${m.site_title}</div>
                        <div class="text-xs opacity-50 font-mono">${m.site_url}</div>
                    </div>
                    <div class="flex gap-2">
                        <form action="/dashboard/ring/approve" method="POST">
                            <input type="hidden" name="member_uri" value="${m.member_uri}" />
                            <button type="submit" class="btn btn-success btn-xs">${t("dashboard.approve")}</button>
                        </form>
                        <form action="/dashboard/ring/reject" method="POST" onsubmit="return confirm('${t("dashboard.confirm_reject")}')">
                            <input type="hidden" name="member_uri" value="${m.member_uri}" />
                            <button type="submit" class="btn btn-ghost btn-xs text-error">${t("dashboard.reject")}</button>
                        </form>
                    </div>
                </div>
            `,
            )}

            <!-- Block List -->
            ${
                blocks.length > 0
                    ? html`
                <div class="mt-8">
                    <h4 class="text-sm font-bold opacity-50 mb-4 uppercase tracking-widest flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                        ${t("dashboard.block_list") || "Block List"}
                    </h4>
                    <div class="overflow-x-auto bg-base-200/50 rounded-lg">
                        <table class="table table-xs w-full">
                            <thead>
                                <tr>
                                    <th>User (DID/Handle)</th>
                                    <th>Ring</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                ${blocks.map(
                                    (b: any) => html`
                                    <tr>
                                        <td>
                                            <div class="font-bold">${b.user_handle || "Unknown"}</div>
                                            <div class="text-[10px] opacity-40 font-mono">${b.subject_did}</div>
                                        </td>
                                        <td class="text-xs">${b.ring_title}</td>
                                        <td class="text-right">
                                            <form action="/dashboard/ring/unblock" method="POST">
                                                <input type="hidden" name="uri" value="${b.uri}" />
                                                <button type="submit" class="btn btn-ghost btn-xs text-error">Unblock</button>
                                            </form>
                                        </td>
                                    </tr>
                                `,
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            `
                    : ""
            }
        </div>
    `;
};
