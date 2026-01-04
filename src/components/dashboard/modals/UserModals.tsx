import { html } from "hono/html";

interface UserModalsProps {
    t: (key: string, options?: any) => string;
}

export const UserModals = ({ t }: UserModalsProps) => {
    return html`
        <!-- Leave Modal (Delete Account) -->
        <dialog id="leave_modal" class="modal">
            <div class="modal-box">
                <h3 class="font-bold text-lg text-error">${t("dashboard.warning")}</h3>
                <p class="py-4">${t("dashboard.confirm_delete_account")}</p>
                <div class="modal-action">
                    <form method="dialog">
                        <button class="btn btn-ghost">${t("common.cancel")}</button>
                    </form>
                    <form action="/dashboard/leave" method="POST">
                        <button class="btn btn-error">${t("dashboard.yes_delete_account")}</button>
                    </form>
                </div>
            </div>
            <form method="dialog" class="modal-backdrop">
                <button>${t("common.close")}</button>
            </form>
        </dialog>
    `;
};
