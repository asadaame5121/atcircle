import { html } from "hono/html";

interface UsageModalsProps {
    t: (key: string, options?: any) => string;
}

export const UsageModals = ({ t }: UsageModalsProps) => {
    return html`
        <!-- Usage Guide Modal -->
        <dialog id="usage_guide_modal" class="modal">
            <div class="modal-box max-w-lg">
                <h3 class="font-black text-2xl italic tracking-tighter text-primary mb-6">${t("dashboard.usage_guide")}</h3>
                
                <div class="space-y-6">
                    <div class="flex gap-4">
                        <div class="flex-none w-10 h-10 rounded-full bg-primary text-primary-content flex items-center justify-center font-bold">1</div>
                        <div>
                            <h4 class="font-bold text-lg">${t("dashboard.usage_guide_step1")}</h4>
                            <p class="text-sm opacity-70 mt-1">${t("dashboard.register_desc")}</p>
                        </div>
                    </div>
                    
                    <div class="flex gap-4">
                        <div class="flex-none w-10 h-10 rounded-full bg-secondary text-secondary-content flex items-center justify-center font-bold">2</div>
                        <div>
                            <h4 class="font-bold text-lg">${t("dashboard.usage_guide_step2")}</h4>
                            <p class="text-sm opacity-70 mt-1">${t("rings.explore_desc")}</p>
                        </div>
                    </div>
                    
                    <div class="flex gap-4">
                        <div class="flex-none w-10 h-10 rounded-full bg-accent text-accent-content flex items-center justify-center font-bold">3</div>
                        <div>
                            <h4 class="font-bold text-lg">${t("dashboard.usage_guide_step3")}</h4>
                            <p class="text-sm opacity-70 mt-1">${t("dashboard.embed_widget_desc")}</p>
                        </div>
                    </div>
                </div>

                <div class="modal-action">
                    <button class="btn btn-primary" onclick="usage_guide_modal.close()">Got it!</button>
                </div>
            </div>
            <form method="dialog" class="modal-backdrop">
                <button>close</button>
            </form>
        </dialog>
    `;
};
