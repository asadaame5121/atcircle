import { html } from "hono/html";

interface MemberModalsProps {
    t: (key: string, options?: any) => string;
}

export const MemberModals = ({ t }: MemberModalsProps) => {
    return html`
        <!-- Member Management Modal -->
        <dialog id="member_management_modal" class="modal">
            <div class="modal-box max-w-2xl">
                <h3 class="font-bold text-lg mb-1">${t("members.title")}</h3>
                <p id="member-modal-subtitle" class="text-sm opacity-60 mb-4 font-mono truncate"></p>
                
                <div id="member-list-loading" class="justify-center py-10 hidden">
                    <span class="loading loading-spinner loading-lg text-primary"></span>
                </div>

                <div id="member-list-container" class="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
                    <!-- Members will be injected here -->
                </div>

                <div class="modal-action">
                    <button class="btn" onclick="member_management_modal.close()">${t("common.close")}</button>
                </div>
            </div>
            <form method="dialog" class="modal-backdrop">
                <button>close</button>
            </form>
        </dialog>

        </dialog>
    `;
};
