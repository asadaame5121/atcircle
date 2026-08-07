import { html } from "hono/html";
import { RingCard } from "./RingCard.js";

interface HomeViewProps {
    previewRings: any[];
    ownerLabels: Record<string, string>;
    t: (key: string, options?: any) => string;
}

export const HomeView = ({ previewRings, ownerLabels, t }: HomeViewProps) => {
    return html`
        <section class="hero min-h-[55vh] bg-base-100 rounded-box shadow-xl">
            <div class="hero-content text-center">
                <div class="max-w-xl">
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

        <section class="mt-12">
            <h2 class="text-2xl font-bold text-center mb-8">${t("home.features_title")}</h2>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="card bg-base-100 shadow-sm border border-base-300">
                    <div class="card-body">
                        <h3 class="card-title"><i class="fa-solid fa-circle-nodes text-primary"></i>${t("home.feature_rings_title")}</h3>
                        <p class="text-sm opacity-70">${t("home.feature_rings_desc")}</p>
                    </div>
                </div>
                <div class="card bg-base-100 shadow-sm border border-base-300">
                    <div class="card-body">
                        <h3 class="card-title"><i class="fa-solid fa-code text-primary"></i>${t("home.feature_widget_title")}</h3>
                        <p class="text-sm opacity-70">${t("home.feature_widget_desc")}</p>
                    </div>
                </div>
                <div class="card bg-base-100 shadow-sm border border-base-300">
                    <div class="card-body">
                        <h3 class="card-title"><i class="fa-solid fa-tower-broadcast text-primary"></i>${t("home.feature_antenna_title")}</h3>
                        <p class="text-sm opacity-70">${t("home.feature_antenna_desc")}</p>
                    </div>
                </div>
                <div class="card bg-base-100 shadow-sm border border-base-300">
                    <div class="card-body">
                        <h3 class="card-title"><i class="fa-solid fa-user-astronaut text-primary"></i>${t("home.feature_oauth_title")}</h3>
                        <p class="text-sm opacity-70">${t("home.feature_oauth_desc")}</p>
                    </div>
                </div>
            </div>
        </section>

        <section class="mt-12">
            <h2 class="text-2xl font-bold text-center mb-8">${t("home.steps_title")}</h2>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div class="card bg-base-100 shadow-sm border border-base-300 text-center">
                    <div class="card-body items-center">
                        <div class="badge badge-primary badge-lg font-black text-lg">1</div>
                        <h3 class="card-title text-base">${t("home.step1_title")}</h3>
                        <p class="text-sm opacity-70">${t("home.step1_desc")}</p>
                    </div>
                </div>
                <div class="card bg-base-100 shadow-sm border border-base-300 text-center">
                    <div class="card-body items-center">
                        <div class="badge badge-primary badge-lg font-black text-lg">2</div>
                        <h3 class="card-title text-base">${t("home.step2_title")}</h3>
                        <p class="text-sm opacity-70">${t("home.step2_desc")}</p>
                    </div>
                </div>
                <div class="card bg-base-100 shadow-sm border border-base-300 text-center">
                    <div class="card-body items-center">
                        <div class="badge badge-primary badge-lg font-black text-lg">3</div>
                        <h3 class="card-title text-base">${t("home.step3_title")}</h3>
                        <p class="text-sm opacity-70">${t("home.step3_desc")}</p>
                    </div>
                </div>
            </div>
        </section>

        <section class="mt-12 hero bg-primary text-primary-content rounded-box shadow-xl">
            <div class="hero-content text-center py-10">
                <div class="max-w-lg">
                    <h2 class="text-3xl font-bold">${t("home.final_cta_title")}</h2>
                    <p class="py-4 opacity-80">${t("home.final_cta_desc")}</p>
                    <div class="flex flex-col sm:flex-row gap-3 justify-center">
                        <a href="/login" class="btn btn-lg">${t("home.cta_login")}</a>
                        <a href="/rings" class="btn btn-outline btn-lg">${t("home.cta_explore")}</a>
                    </div>
                </div>
            </div>
        </section>
    `;
};
