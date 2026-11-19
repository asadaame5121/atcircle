import { html } from "hono/html";

interface MemberModalsProps {
    t: (key: string, options?: any) => string;
}

export const MemberModals = ({ t }: MemberModalsProps) => {
    return html`
        <dialog id="member_management_modal" class="rt-dialog rt-dialog-wide" aria-labelledby="member-modal-title">
            <h3 id="member-modal-title" class="rt-box-title">${t("members.title")}</h3>
            <div class="rt-dialog-body">
                <p id="member-modal-subtitle" class="rt-note rt-did"></p>
                <p id="member-list-loading" class="rt-center" hidden>Loading…</p>
                <div id="member-list-container" class="rt-member-list"></div>
                <div class="rt-dialog-actions">
                    <span class="rt-dialog-spacer"></span>
                    <button type="button" class="rt-bevel" onclick="member_management_modal.close()">${t("common.close")}</button>
                </div>
            </div>
        </dialog>
    `;
};
