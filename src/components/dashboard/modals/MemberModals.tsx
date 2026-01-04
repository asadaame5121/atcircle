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

        <!-- Invite Friends Modal -->
        <dialog id="invite_friends_modal" class="modal">
            <div class="modal-box max-w-2xl">
                <h3 class="font-bold text-lg mb-1">${t("dashboard.invite_friends") || "友人を招待"}</h3>
                <p id="invite-modal-subtitle" class="text-sm opacity-60 mb-4 font-mono truncate"></p>

                <div class="form-control mb-4">
                    <div class="join w-full">
                        <input type="text" id="friend-search-input" class="input input-bordered join-item w-full" placeholder="${t("dashboard.search_placeholder") || "ハンドルや名前で検索..."}" oninput="window.filterFriends()" />
                        <button class="btn join-item"><i class="fa-solid fa-magnifying-glass"></i></button>
                    </div>
                </div>

                <div id="friend-list-loading" class="justify-center py-10 hidden">
                    <span class="loading loading-spinner loading-lg text-primary"></span>
                </div>

                <div id="friend-list-container" class="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[45vh] overflow-y-auto pr-2 mb-4">
                    <!-- Friends will be injected here -->
                </div>

                <div class="flex justify-between items-center border-t border-base-300 pt-4">
                    <div class="text-sm opacity-70">
                        <span id="selected-count">0</span> / 10 ${t("dashboard.selected") || "選択中"}
                    </div>
                    <div class="modal-action mt-0">
                        <button type="button" class="btn" onclick="invite_friends_modal.close()">${t("common.cancel")}</button>
                        <button type="button" id="send-invite-btn" class="btn btn-primary" onclick="window.sendInvites()" disabled>
                            ${t("dashboard.generate_invite") || "招待投稿を作成"}
                        </button>
                    </div>
                </div>
            </div>
            <form method="dialog" class="modal-backdrop">
                <button>close</button>
            </form>
        </dialog>
    `;
};
