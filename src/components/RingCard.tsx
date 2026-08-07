import { html } from "hono/html";

interface RingCardProps {
    ring: any;
    ownerLabel?: string;
    t: (key: string, options?: any) => string;
}

export const RingCard = ({ ring, ownerLabel, t }: RingCardProps) => {
    const owner = ownerLabel || ring.owner_did || "unknown";

    return html`
        <div class="card bg-base-200 shadow-sm border border-base-300 transition-all hover:border-primary/50 hover:shadow-md">
            <div class="card-body p-6">
                <div class="flex justify-between items-start mb-2">
                    <h2 class="card-title text-xl font-bold break-all">${ring.title}</h2>
                    <div class="badge badge-primary badge-outline shrink-0">${t("rings.member_count", { count: ring.member_count ?? 0 })}</div>
                </div>
                <p class="text-sm opacity-60 mb-2 truncate break-all" title="${owner}">${t("rings.by", { did: owner })}</p>
                <p class="text-base mb-4 line-clamp-2">${ring.description || t("common.no_description")}</p>
                <div class="card-actions justify-end mt-2">
                    <a href="/rings/view?ring=${encodeURIComponent(ring.uri)}" class="btn btn-sm btn-outline btn-primary">${t("rings.view_sites")}</a>
                    <a href="/nav/random?ring=${encodeURIComponent(ring.uri)}" class="btn btn-sm btn-circle btn-ghost" title="${t("rings.random_jump")}" aria-label="${t("rings.random_jump")}">
                        <i class="fa-solid fa-shuffle"></i>
                    </a>
                </div>
            </div>
        </div>
    `;
};
