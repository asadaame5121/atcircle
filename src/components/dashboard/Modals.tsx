import { html } from "hono/html";

export const Modals = (props: {
    site: any;
    t: (key: string, options?: any) => string;
}) => {
    const { site, t } = props;

    return html`
        <!-- Create Ring Modal -->
        <dialog id="create_ring_modal" class="modal">
            <div class="modal-box">
                <h3 class="font-bold text-lg">${t("dashboard.modal_create_title")}</h3>
                <form action="/dashboard/ring/create" method="POST" class="mt-4">
                    <div class="form-control w-full mb-4">
                        <label class="label"><span class="label-text">${t("dashboard.modal_ring_name")}</span></label>
                        <input type="text" name="title" required class="input input-bordered w-full" placeholder="${t("dashboard.modal_ring_name_placeholder")}" />
                    </div>
                     <div class="form-control w-full mb-4">
                        <label class="label"><span class="label-text">${t("dashboard.modal_description")}</span></label>
                        <textarea name="description" class="textarea textarea-bordered h-24" placeholder="${t("dashboard.modal_description_placeholder")}"></textarea>
                    </div>
                    <div class="modal-action">
                        <button type="button" class="btn" onclick="create_ring_modal.close()">${t("common.cancel")}</button>
                        <button type="submit" class="btn btn-primary">${t("common.create")}</button>
                    </div>
                </form>
            </div>
             <form method="dialog" class="modal-backdrop">
                <button>${t("common.close")}</button>
            </form>
        </dialog>

         <!-- Join Ring Modal -->
        <dialog id="join_ring_modal" class="modal">
            <div class="modal-box">
                <h3 class="font-bold text-lg">${t("dashboard.modal_join_title")}</h3>
                <form action="/dashboard/ring/join" method="POST" class="mt-4">
                     <div class="form-control w-full mb-4">
                        <label class="label"><span class="label-text">${t("dashboard.modal_ring_uri")}</span></label>
                        <input type="text" name="ring_uri" id="join-ring-uri" required class="input input-bordered w-full font-mono text-sm" placeholder="at://did:plc:.../..." />
                    </div>
                    <div class="divider">${t("dashboard.modal_your_site_details")}</div>
                     <div class="form-control w-full mb-4">
                        <label class="label"><span class="label-text">${t("dashboard.site_url")}</span></label>
                        <input type="url" name="url" required class="input input-bordered w-full" value="${site.url}" />
                    </div>
                     <div class="form-control w-full mb-4">
                        <label class="label"><span class="label-text">${t("dashboard.site_title")}</span></label>
                        <input type="text" name="title" required class="input input-bordered w-full" value="${site.title}" />
                    </div>
                     <div class="form-control w-full mb-4">
                        <label class="label"><span class="label-text">RSS (${t("common.optional")})</span></label>
                        <input type="url" name="rss" class="input input-bordered w-full" value="${site.rss_url || ""}" />
                    </div>
                    <div class="modal-action">
                        <button type="button" class="btn" onclick="join_ring_modal.close()">${t("common.cancel")}</button>
                        <button type="submit" class="btn btn-secondary">${t("common.join")}</button>
                    </div>
                </form>
            </div>
             <form method="dialog" class="modal-backdrop">
                <button>${t("common.close")}</button>
            </form>
        </dialog>

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

        <!-- Circle Config Modal -->
        <dialog id="circle_config_modal" class="modal">
            <div class="modal-box">
                <h3 class="font-bold text-lg">${t("dashboard.modal_config_title")}</h3>
                <form action="/dashboard/ring/update" method="POST" class="mt-4">
                    <input type="hidden" name="uri" id="config-uri" />
                    
                    <div class="form-control w-full mb-4">
                        <label class="label"><span class="label-text">${t("dashboard.modal_ring_name")}</span></label>
                        <input type="text" name="title" id="config-title" required class="input input-bordered w-full" />
                    </div>

                    <div class="form-control w-full mb-4">
                        <label class="label"><span class="label-text">${t("dashboard.modal_description")}</span></label>
                        <textarea name="description" id="config-description" class="textarea textarea-bordered h-24"></textarea>
                    </div>

                    <div class="grid grid-cols-2 gap-4">
                        <div class="form-control">
                            <label class="label"><span class="label-text">${t("dashboard.status_public")}</span></label>
                            <select name="status" id="config-status" class="select select-bordered w-full">
                                <option value="open">${t("dashboard.status_open")}</option>
                                <option value="closed">${t("dashboard.status_closed")}</option>
                            </select>
                        </div>
                        <div class="form-control">
                            <label class="label"><span class="label-text">${t("dashboard.acceptance_policy")}</span></label>
                            <select name="acceptance_policy" id="config-acceptance" class="select select-bordered w-full">
                                <option value="manual">${t("dashboard.acceptance_manual")}</option>
                                <option value="automatic">${t("dashboard.acceptance_automatic")}</option>
                            </select>
                        </div>
                    </div>

                    <div class="form-control w-full mt-4">
                        <label class="label"><span class="label-text">Administrator DID</span></label>
                        <input type="text" name="admin_did" id="config-admin" required class="input input-bordered w-full font-mono text-xs" placeholder="did:plc:..." />
                        <p class="text-[10px] opacity-50 mt-1">Single administrator. Defaults to owner DID.</p>
                    </div>

                    <div class="modal-action flex justify-between">
                        <div class="flex gap-2">
                             <button type="button" class="btn btn-error btn-outline" onclick="if(confirm('${t("dashboard.confirm_delete_ring")}')) { 
                                const form = document.createElement('form');
                                form.method = 'POST';
                                form.action = '/dashboard/ring/delete';
                                const input = document.createElement('input');
                                input.type = 'hidden';
                                input.name = 'uri';
                                input.value = document.getElementById('config-uri').value;
                                form.appendChild(input);
                                document.body.appendChild(form);
                                form.submit();
                             }">${t("dashboard.delete_ring")}</button>
                        </div>
                        <div class="flex gap-2">
                            <button type="button" class="btn" onclick="circle_config_modal.close()">${t("common.cancel")}</button>
                            <button type="submit" class="btn btn-primary">${t("common.save")}</button>
                        </div>
                    </div>
                </form>
            </div>
            <form method="dialog" class="modal-backdrop">
                <button>${t("common.close")}</button>
            </form>
        </dialog>
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

        <script>
            function openConfigModal(uri, title, description, status, acceptance, admin) {
                document.getElementById('config-uri').value = uri;
                document.getElementById('config-title').value = title;
                document.getElementById('config-description').value = description;
                document.getElementById('config-status').value = status;
                document.getElementById('config-acceptance').value = acceptance || 'automatic';
                document.getElementById('config-admin').value = admin || '';
                circle_config_modal.showModal();
            }

            function openConfigModalFromBtn(btn) {
                const ds = btn.dataset;
                openConfigModal(ds.uri, ds.title, ds.description, ds.status, ds.acceptance, ds.admin);
            }

            function openJoinModal(uri) {
                document.getElementById('join-ring-uri').value = uri;
                join_ring_modal.showModal();
            }

            function openJoinModalFromBtn(btn) {
                openJoinModal(btn.dataset.uri);
            }

            function copyInviteLink(ringUri) {
                const baseUrl = window.location.origin;
                const inviteUrl = baseUrl + '/rings/view?ring=' + encodeURIComponent(ringUri);
                navigator.clipboard.writeText(inviteUrl).then(() => {
                    alert('${t("dashboard.alert_copy_invite_success")}');
                });
            }

            function copyInviteLinkFromBtn(btn) {
                copyInviteLink(btn.dataset.uri);
            }

            // Auto-open join modal if ring_uri is present in URL
            window.addEventListener('load', () => {
                const params = new URLSearchParams(window.location.search);
                const ringUri = params.get('ring_uri');
                if (ringUri) {
                    openJoinModal(ringUri);
                }
            });
        </script>
    `;
};
