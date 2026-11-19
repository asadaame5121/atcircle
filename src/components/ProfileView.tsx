import { html } from "hono/html";
import { safeHref } from "../lib/html.js";

interface ProfileViewProps {
    handle: string;
    did: string;
    sites: any[];
    memberships: any[];
    t: (key: string, options?: any) => string;
}

/** 公開プロフィール（/u/:handle） */
export const ProfileView = ({
    handle,
    did,
    sites,
    memberships,
    t,
}: ProfileViewProps) => {
    return html`
        <h1 class="rt-h1">★ ${handle} ★</h1>
        <p class="rt-lead">
            <span class="rt-did">${did}</span><br>
            <a href="https://bsky.app/profile/${encodeURIComponent(handle)}" target="_blank" rel="noopener noreferrer">${t("profile.bluesky")}</a>
        </p>

        <section class="rt-box rt-section" aria-labelledby="profile-sites">
            <h2 id="profile-sites" class="rt-box-title">${t("profile.sites")}</h2>
            ${
                sites && sites.length > 0
                    ? html`<ul class="rt-ring-list">
                ${sites.map(
                    (s, i) => html`
                    <li class="rt-ring-row${i === 0 ? " rt-ring-row-first" : ""}">
                        <span class="rt-ring-head">
                            <span class="rt-mark" aria-hidden="true">◆</span>
                            <a href="${safeHref(s.url)}" target="_blank" rel="noopener noreferrer" class="rt-ring-name">${s.title}</a>
                            <span class="rt-ring-meta">${s.url}</span>
                        </span>
                        ${s.description ? html`<span class="rt-ring-desc">${s.description}</span>` : ""}
                    </li>
                `,
                )}
            </ul>`
                    : html`<p class="rt-empty">${t("profile.no_sites")}</p>`
            }
        </section>

        <section class="rt-box" aria-labelledby="profile-rings">
            <h2 id="profile-rings" class="rt-box-title">${t("profile.rings")}</h2>
            ${
                memberships && memberships.length > 0
                    ? html`<ul class="rt-ring-list">
                ${memberships.map(
                    (m, i) => html`
                    <li class="rt-ring-row${i === 0 ? " rt-ring-row-first" : ""}">
                        <span class="rt-ring-head">
                            <span class="rt-mark" aria-hidden="true">◆</span>
                            <a href="${m.slug ? `/r/${encodeURIComponent(m.slug)}` : `/rings/view?ring=${encodeURIComponent(m.uri)}`}" class="rt-ring-name">${m.title}</a>
                        </span>
                    </li>
                `,
                )}
            </ul>`
                    : html`<p class="rt-empty">${t("profile.no_rings")}</p>`
            }
        </section>
    `;
};
