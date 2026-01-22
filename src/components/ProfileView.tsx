import { html } from "hono/html";

interface ProfileViewProps {
    handle: string;
    did: string;
    sites: any[];
    memberships: any[];
    t: (key: string, options?: any) => string;
}

export const ProfileView = ({
    handle,
    did,
    sites,
    memberships,
    t,
}: ProfileViewProps) => {
    return html`
        <div class="max-w-4xl mx-auto space-y-8">
            <!-- Profile Header -->
            <div class="card bg-base-100 shadow-xl overflow-hidden">
                <div class="h-32 bg-linear-to-r from-primary to-secondary opacity-20"></div>
                <div class="px-8 pb-8 -mt-12 relative">
                    <div class="flex flex-col md:flex-row md:items-end gap-6">
                        <div class="avatar">
                            <div class="w-32 h-32 rounded-3xl ring ring-base-100 shadow-lg bg-base-300">
                                <div class="w-full h-full flex items-center justify-center text-4xl" role="img" aria-label="Avatar icon">👤</div>
                            </div>
                        </div>
                        <div class="flex-1 min-w-0">
                            <h1 class="text-3xl font-black italic tracking-tighter truncate">${handle}</h1>
                            <p class="text-sm opacity-50 font-mono break-all">${did}</p>
                        </div>
                        <div class="flex gap-2">
                            <a href="https://bsky.app/profile/${handle}" target="_blank" class="btn btn-primary btn-sm rounded-full">
                                Bluesky Profile
                            </a>
                        </div>
                    </div>
                </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
                <!-- Sites Column -->
                <div class="md:col-span-2 space-y-4">
                    <h2 class="text-xl font-bold flex items-center gap-2">
                        <i class="fa-solid fa-earth-americas opacity-50"></i>
                        Registered Sites
                    </h2>
                    ${
                        sites && sites.length > 0
                            ? sites.map(
                                  (s) => html`
                        <div class="card bg-base-100 border border-base-300 shadow-sm transition-hover hover:shadow-md">
                            <div class="card-body p-5">
                                <h3 class="font-bold text-lg leading-tight mb-1">${s.title}</h3>
                                <a href="${s.url}" target="_blank" class="link link-primary text-sm truncate mb-3 break-all">${s.url}</a>
                                <p class="text-sm opacity-70 mb-4">${s.description || ""}</p>
                                <div class="card-actions justify-end">
                                    <a href="${s.url}" target="_blank" class="btn btn-xs btn-outline rounded-full">Visit Site</a>
                                </div>
                            </div>
                        </div>
                    `,
                              )
                            : html`<div class="alert alert-ghost border-dashed">No sites registered yet.</div>`
                    }
                </div>

                <!-- Webrings Column -->
                <div class="space-y-4">
                    <h2 class="text-xl font-bold flex items-center gap-2">
                        <i class="fa-solid fa-circle-nodes opacity-50"></i>
                        Webrings
                    </h2>
                    <div class="flex flex-col gap-2">
                        ${
                            memberships && memberships.length > 0
                                ? memberships.map(
                                      (m) => html`
                            <a href="${m.slug ? `/r/${m.slug}` : `/rings/view?ring=${encodeURIComponent(m.uri)}`}" 
                               class="glass bg-base-200 p-4 rounded-2xl border border-base-300 hover:border-primary/50 transition-colors group">
                                <div class="font-bold group-hover:text-primary transition-colors">${m.title}</div>
                                <div class="text-[10px] opacity-40 font-mono truncate">${m.uri}</div>
                            </a>
                        `,
                                  )
                                : html`<div class="text-sm opacity-50 italic px-2">Not joined any rings yet.</div>`
                        }
                    </div>
                </div>
            </div>
            
            <div class="text-center pt-8">
                <a href="/" class="btn btn-ghost btn-sm">${t("common.back_to_home")}</a>
            </div>
        </div>
    `;
};
