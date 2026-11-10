import { html } from "hono/html";
import { safeHref } from "../lib/html.js";
import type { AntennaItem } from "../repositories/antenna.repository.js";

interface AntennaViewProps {
    items: AntennaItem[];
    ringInfo: { title: string } | null;
    ringUri: string | undefined;
    t: (key: string, options?: any) => string;
}

const formatDate = (seconds: number) => {
    const d = new Date(seconds * 1000);
    if (Number.isNaN(d.getTime())) return "";
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())}`;
};

/** アンテナ（メンバーサイトの更新一覧） */
export const AntennaView = ({
    items,
    ringInfo,
    ringUri,
    t,
}: AntennaViewProps) => {
    return html`
        ${ringUri && ringInfo ? html`<p class="rt-crumbs"><a href="/rings/view?ring=${encodeURIComponent(ringUri)}">${ringInfo.title}</a> ≫ ${t("common.antenna")}</p>` : ""}
        <h1 class="rt-h1">■ ${ringInfo ? ringInfo.title : t("antenna.global_title")} ■</h1>
        <p class="rt-lead">${ringInfo ? t("antenna.ring_desc") : t("antenna.global_desc")}</p>
        <section class="rt-box" aria-labelledby="antenna-heading">
            <h2 id="antenna-heading" class="rt-box-title">${t("common.antenna")}</h2>
            ${
                items && items.length > 0
                    ? html`<ul class="rt-ring-list">
                ${items.map(
                    (item, i) => html`
                    <li class="rt-ring-row${i === 0 ? " rt-ring-row-first" : ""}">
                        <span class="rt-ring-head">
                            <span class="rt-mark" aria-hidden="true">◆</span>
                            <a href="${safeHref(item.item_url)}" target="_blank" rel="noopener noreferrer" class="rt-ring-name">${item.item_title}</a>
                        </span>
                        <span class="rt-ring-desc">
                            <time>${formatDate(item.published_at)}</time> ｜
                            <a href="${safeHref(item.site_url)}" target="_blank" rel="noopener noreferrer">${item.site_title}</a>
                        </span>
                    </li>
                `,
                )}
            </ul>`
                    : html`<p class="rt-empty"><b>${t("antenna.no_updates")}</b><br>${t("antenna.no_updates_desc")}</p>`
            }
        </section>
    `;
};
