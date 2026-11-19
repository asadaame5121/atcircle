import { html } from "hono/html";

interface RingModalsProps {
    t: (key: string, options?: any) => string;
}

/** リング設定のダイアログ（作成・参加は専用画面に移した） */
export const RingModals = ({ t }: RingModalsProps) => {
    return html`
        <dialog id="circle_config_modal" class="rt-dialog" aria-labelledby="config-modal-title">
            <h3 id="config-modal-title" class="rt-box-title">${t("dashboard.modal_config_title")}</h3>
            <form action="/dashboard/ring/update" method="POST" class="rt-dialog-body">
                <input type="hidden" name="uri" id="config-uri" />

                <label class="rt-label" for="config-title">${t("dashboard.modal_ring_name")}</label>
                <input type="text" name="title" id="config-title" required maxlength="100" class="rt-sunken rt-input" />

                <label class="rt-label" for="config-description">${t("dashboard.modal_description")}</label>
                <textarea name="description" id="config-description" rows="3" maxlength="500" class="rt-sunken rt-input rt-textarea"></textarea>

                <div class="rt-grid2">
                    <div>
                        <label class="rt-label" for="config-status">${t("dashboard.status_public")}</label>
                        <select name="status" id="config-status" class="rt-sunken rt-input">
                            <option value="open">${t("dashboard.status_open")}</option>
                            <option value="closed">${t("dashboard.status_closed")}</option>
                        </select>
                    </div>
                    <div>
                        <label class="rt-label" for="config-acceptance">${t("dashboard.acceptance_policy")}</label>
                        <select name="acceptance_policy" id="config-acceptance" class="rt-sunken rt-input">
                            <option value="manual">${t("dashboard.acceptance_manual")}</option>
                            <option value="automatic">${t("dashboard.acceptance_automatic")}</option>
                        </select>
                    </div>
                </div>

                <label class="rt-label" for="config-admin">Administrator DID</label>
                <input type="text" name="admin_did" id="config-admin" required class="rt-sunken rt-input rt-mono" placeholder="did:plc:..." />
                <p class="rt-note">Single administrator. Defaults to owner DID.</p>

                <label class="rt-label" for="config-slug">${t("dashboard.field_slug")}</label>
                <div class="rt-prefix-input">
                    <span aria-hidden="true">/r/</span>
                    <input type="text" name="slug" id="config-slug" class="rt-sunken rt-input rt-mono" placeholder="my-awesome-ring" pattern="[a-z0-9-]{3,32}" title="${t("dashboard.field_slug_help")}" />
                </div>
                <p class="rt-note">${t("dashboard.field_slug_help")}</p>

                <label class="rt-label" for="config-banner">${t("dashboard.banner_url")}</label>
                <input type="url" name="banner_url" id="config-banner" class="rt-sunken rt-input rt-mono" placeholder="https://example.com/banner.png" />
                <p class="rt-note">${t("dashboard.banner_url_help")}</p>

                <div class="rt-dialog-actions">
                    <button type="button" class="rt-bevel rt-danger" data-confirm-message="${t("dashboard.confirm_delete_ring")}" onclick="window.deleteRingFromConfig(this)">${t("dashboard.delete_ring")}</button>
                    <span class="rt-dialog-spacer"></span>
                    <button type="button" class="rt-bevel" onclick="circle_config_modal.close()">${t("common.cancel")}</button>
                    <button type="submit" class="rt-bevel rt-go">${t("common.save")}</button>
                </div>
            </form>
        </dialog>
    `;
};
