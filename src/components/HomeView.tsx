import { html } from "hono/html";
import { RingCard } from "./RingCard.js";

interface HomeViewProps {
    previewRings: any[];
    ownerLabels: Record<string, string>;
    t: (key: string, options?: any) => string;
}

export const HomeView = ({ previewRings, ownerLabels, t }: HomeViewProps) => {
    return html`
        <section class="hero min-h-[46vh] bg-base-100 rounded-box border border-base-300">
            <div class="hero-content text-center">
                <div class="max-w-3xl">
                    <h1 class="text-4xl sm:text-5xl font-bold text-primary">${t("home.welcome")}</h1>
                    <p class="py-6 text-lg opacity-75">${t("home.description")}</p>
                    <div class="flex flex-col sm:flex-row gap-3 justify-center">
                        <a href="/login" class="btn btn-primary btn-lg">${t("home.cta_login")}</a>
                        <a href="/rings" class="btn btn-outline btn-lg">${t("home.cta_explore")}</a>
                    </div>
                </div>
            </div>
        </section>

        ${
            previewRings.length > 0
                ? html`
        <section class="mt-8">
            <div class="flex flex-wrap justify-between items-end gap-2 mb-4">
                <div>
                    <h2 class="text-2xl font-bold">${t("home.preview_rings_title")}</h2>
                    <p class="text-sm opacity-60">${t("home.preview_rings_desc")}</p>
                </div>
                <a href="/rings" class="btn btn-ghost btn-sm">${t("home.preview_rings_more")} <i class="fa-solid fa-arrow-right ml-1"></i></a>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                ${previewRings.map((ring) =>
                    RingCard({
                        ring,
                        ownerLabel: ownerLabels[ring.owner_did],
                        t,
                    }),
                )}
            </div>
        </section>
        `
                : ""
        }

        <section class="mt-16">
            <div class="mb-6">
                <h2 class="text-2xl font-bold">${t("home.features_title")}</h2>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-x-12 border-y border-base-300">
                <div class="flex gap-4 py-6 px-2">
                    <i class="fa-solid fa-circle-nodes text-primary text-xl mt-1 w-6 text-center"></i>
                    <div>
                        <h3 class="text-lg font-bold">${t("home.feature_rings_title")}</h3>
                        <p class="text-sm opacity-70 mt-1">${t("home.feature_rings_desc")}</p>
                    </div>
                </div>
                <div class="flex gap-4 py-6 px-2">
                    <i class="fa-solid fa-code text-primary text-xl mt-1 w-6 text-center"></i>
                    <div>
                        <h3 class="text-lg font-bold">${t("home.feature_widget_title")}</h3>
                        <p class="text-sm opacity-70 mt-1">${t("home.feature_widget_desc")}</p>
                    </div>
                </div>
                <div class="flex gap-4 py-6 px-2">
                    <i class="fa-solid fa-tower-broadcast text-primary text-xl mt-1 w-6 text-center"></i>
                    <div>
                        <h3 class="text-lg font-bold">${t("home.feature_antenna_title")}</h3>
                        <p class="text-sm opacity-70 mt-1">${t("home.feature_antenna_desc")}</p>
                    </div>
                </div>
                <div class="flex gap-4 py-6 px-2">
                    <i class="fa-solid fa-user-astronaut text-primary text-xl mt-1 w-6 text-center"></i>
                    <div>
                        <h3 class="text-lg font-bold">${t("home.feature_oauth_title")}</h3>
                        <p class="text-sm opacity-70 mt-1">${t("home.feature_oauth_desc")}</p>
                    </div>
                </div>
            </div>
        </section>

        <section class="mt-16">
            <div class="mb-6">
                <h2 class="text-2xl font-bold">${t("home.steps_title")}</h2>
            </div>
            <ol class="grid grid-cols-1 md:grid-cols-3 border-y border-base-300">
                <li class="flex gap-4 py-6 px-2 md:px-5">
                    <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-content font-bold">1</span>
                    <div>
                        <h3 class="text-lg font-bold">${t("home.step1_title")}</h3>
                        <p class="text-sm opacity-70 mt-1">${t("home.step1_desc")}</p>
                    </div>
                </li>
                <li class="flex gap-4 py-6 px-2 md:px-5">
                    <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-content font-bold">2</span>
                    <div>
                        <h3 class="text-lg font-bold">${t("home.step2_title")}</h3>
                        <p class="text-sm opacity-70 mt-1">${t("home.step2_desc")}</p>
                    </div>
                </li>
                <li class="flex gap-4 py-6 px-2 md:px-5">
                    <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-content font-bold">3</span>
                    <div>
                        <h3 class="text-lg font-bold">${t("home.step3_title")}</h3>
                        <p class="text-sm opacity-70 mt-1">${t("home.step3_desc")}</p>
                    </div>
                </li>
            </ol>
        </section>

        <section class="mt-16 hero bg-base-100 rounded-box border border-base-300">
            <div class="hero-content text-center py-10">
                <div class="max-w-lg">
                    <h2 class="text-2xl font-bold">${t("home.final_cta_title")}</h2>
                    <p class="py-4 opacity-70">${t("home.final_cta_desc")}</p>
                    <div class="flex flex-col sm:flex-row gap-3 justify-center">
                        <a href="/login" class="btn btn-primary btn-lg">${t("home.cta_login")}</a>
                        <a href="/rings" class="btn btn-outline btn-lg">${t("home.cta_explore")}</a>
                    </div>
                </div>
            </div>
        </section>
    `;
};
