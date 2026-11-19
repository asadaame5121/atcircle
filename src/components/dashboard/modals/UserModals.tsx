import { html } from "hono/html";

interface UserModalsProps {
    t: (key: string, options?: any) => string;
}

export const UserModals = ({ t }: UserModalsProps) => {
    return html`
        <dialog id="leave_modal" class="rt-dialog" aria-labelledby="leave-modal-title">
            <h3 id="leave-modal-title" class="rt-box-title rt-box-title-danger">${t("dashboard.warning")}</h3>
            <div class="rt-dialog-body">
                <p>${t("dashboard.confirm_delete_account")}</p>
                <div class="rt-dialog-actions">
                    <span class="rt-dialog-spacer"></span>
                    <form method="dialog">
                        <button class="rt-bevel">${t("common.cancel")}</button>
                    </form>
                    <form action="/dashboard/leave" method="POST">
                        <button class="rt-bevel rt-danger">${t("dashboard.yes_delete_account")}</button>
                    </form>
                </div>
            </div>
        </dialog>
    `;
};
