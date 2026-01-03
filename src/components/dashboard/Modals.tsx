import { html, raw } from "hono/html";

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

                    <div class="form-control w-full mt-4">
                        <label class="label"><span class="label-text">${t("dashboard.field_slug")}</span></label>
                        <div class="join w-full">
                            <span class="join-item bg-base-200 border border-base-300 px-3 flex items-center text-xs font-mono">/r/</span>
                            <input type="text" name="slug" id="config-slug" class="input input-bordered join-item w-full font-mono text-sm" placeholder="my-awesome-ring" pattern="[a-z0-9-]{3,32}" title="${t("dashboard.field_slug_help")}" />
                        </div>
                        <p class="text-[10px] opacity-50 mt-1">${t("dashboard.field_slug_help")}</p>
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

        <!-- I18n Data Store -->
        <script id="i18n-data" type="application/json">
            ${raw(
                JSON.stringify({
                    noMembers: t("members.no_members"),
                    statusApproved: t("members.status_approved"),
                    statusPending: t("members.status_pending"),
                    statusSuspended: t("members.status_suspended"),
                    kick: t("members.kick"),
                    block: t("members.block"),
                    kickSuccess: t("members.kick_success"),
                    blockSuccess: t("members.block_success"),
                    confirmKick: t("members.confirm_kick"),
                    confirmBlock: t("members.confirm_block"),
                    widgetInstalled: t("members.widget_installed"),
                    widgetNotInstalled: t("members.widget_not_installed"),
                    verifyNow: t("members.verify_now"),
                    inviteSent: "Invite link copied to clipboard!",
                    inviteMessageTemplate:
                        '{{handles}}\\n\\nWebring "{{title}}" に参加しませんか？\\n#atcircle\\n\\n{{url}}',
                }),
            )}
        </script>

        <script>
            (function() {
            try {
                console.log('ATcircle Dashboard: Initializing script...');
                
                // Load I18n
                const i18n = JSON.parse(document.getElementById('i18n-data').textContent);

                // Global State
                window.atcircle = {
                    currentRingUri: '',
                    currentRingTitle: '',
                    allFollows: [],
                    selectedDids: new Set()
                };

                // Configuration Modal
                window.openConfigModalFromBtn = function(btn) {
                    const ds = btn.dataset;
                    window.openConfigModal(ds.uri, ds.title, ds.description, ds.status, ds.acceptance, ds.admin, ds.slug);
                };

                window.openConfigModal = function(uri, title, description, status, acceptance, admin, slug) {
                    document.getElementById('config-uri').value = uri || '';
                    document.getElementById('config-title').value = title || '';
                    document.getElementById('config-description').value = description || '';
                    document.getElementById('config-status').value = status || 'open';
                    document.getElementById('config-acceptance').value = acceptance || 'automatic';
                    document.getElementById('config-admin').value = admin || '';
                    document.getElementById('config-slug').value = slug || '';
                    if (window.circle_config_modal) circle_config_modal.showModal();
                };

                // Member Management
                window.openMemberModal = async function(uri, title) {
                    window.atcircle.currentRingUri = uri;
                    document.getElementById('member-modal-subtitle').textContent = uri;
                    if (window.member_management_modal) member_management_modal.showModal();
                    await window.refreshMemberList();
                };

                window.openMemberModalFromBtn = function(btn) {
                    window.openMemberModal(btn.dataset.uri, btn.dataset.title);
                };

                window.refreshMemberList = async function() {
                    const container = document.getElementById('member-list-container');
                    const loading = document.getElementById('member-list-loading');
                    if (!container || !loading) return;

                    container.innerHTML = '';
                    loading.classList.remove('hidden');
                    loading.classList.add('flex');

                    try {
                        const res = await fetch('/dashboard/ring/members/list?ring_uri=' + encodeURIComponent(window.atcircle.currentRingUri));
                        const data = await res.json();
                        loading.classList.add('hidden');
                        loading.classList.remove('flex');

                        if (data.success) {
                            if (!data.members || data.members.length === 0) {
                                container.innerHTML = '<div class="text-center py-8 opacity-50 italic">' + i18n.noMembers + '</div>';
                                return;
                            }

                            data.members.forEach(m => {
                                const div = document.createElement('div');
                                div.className = 'flex items-center justify-between p-3 bg-base-200 rounded-lg border border-base-300';
                                
                                const isApproved = m.status === 'approved' ? 'selected' : '';
                                const isPending = m.status === 'pending' ? 'selected' : '';
                                const isSuspended = m.status === 'suspended' ? 'selected' : '';
                                
                                const avatarUrl = m.avatar || 'https://cdn.bsky.app/img/avatar/plain/did:plc:z72i7hdynmk6p22nfzvega35/asadaame5121@1.png';
                                const handle = m.handle ? '@' + m.handle : 'DID: ' + m.user_did;
                                const displayName = m.displayName || m.title || 'Unknown';

                                 div.innerHTML = '<div class="flex items-center gap-3 min-w-0 flex-1">' +
                                    '<div class="avatar">' +
                                    '<div class="w-10 h-10 rounded-full">' +
                                    '<img src="' + avatarUrl + '" alt="Avatar" />' +
                                    '</div>' +
                                    '</div>' +
                                    '<div class="flex flex-col min-w-0">' +
                                    '<span class="font-bold truncate">' + displayName + '</span>' +
                                    '<span class="text-xs opacity-50 truncate">' + handle + '</span>' +
                                    '<div class="flex items-center gap-2 mt-0.5">' +
                                        '<a href="' + m.url + '" target="_blank" class="text-[10px] link link-primary truncate max-w-[150px]">' + m.url + '</a>' +
                                        '<div class="flex items-center gap-1 ml-1">' +
                                            (m.widget_installed ? 
                                                '<span class="badge badge-success badge-xs gap-1 py-1.5" title="' + i18n.widgetInstalled + '"><i class="fa-solid fa-check text-[8px]"></i></span>' : 
                                                '<span class="badge badge-error badge-xs gap-1 py-1.5" title="' + i18n.widgetNotInstalled + '"><i class="fa-solid fa-xmark text-[8px]"></i></span>') +
                                            '<button class="btn btn-ghost btn-xs btn-circle h-5 w-5 min-h-0" onclick="window.verifyMemberWidget(\\\'' + m.user_did + '\\\')" title="' + i18n.verifyNow + '">' +
                                                '<i class="fa-solid fa-rotate text-[10px]"></i>' +
                                            '</button>' +
                                        '</div>' +
                                    '</div>' +
                                    '</div>' +
                                    '</div>' +
                                    '<div class="flex items-center gap-2">' +
                                    '<select class="select select-bordered select-xs" onchange="window.updateMemberStatus(\\\'' + m.user_did + '\\\', this.value)">' +
                                    '<option value="approved" ' + isApproved + '>' + i18n.statusApproved + '</option>' +
                                    '<option value="pending" ' + isPending + '>' + i18n.statusPending + '</option>' +
                                    '<option value="suspended" ' + isSuspended + '>' + i18n.statusSuspended + '</option>' +
                                    '</select>' +
                                    '<button class="btn btn-ghost btn-xs btn-outline" onclick="window.kickMember(\\\'' + m.user_did + '\\\', \\\'' + displayName.replace(/'/g, "\\\\'") + '\\\')">' + i18n.kick + '</button>' +
                                    '<button class="btn btn-error btn-xs btn-outline" onclick="window.blockMember(\\\'' + m.user_did + '\\\', \\\'' + displayName.replace(/'/g, "\\\\'") + '\\\')">' + i18n.block + '</button>' +
                                    '</div>';
                                container.appendChild(div);
                            });
                        } else {
                            container.innerHTML = '<div class="alert alert-error font-bold">' + (data.error || 'Unknown error') + '</div>';
                        }
                    } catch (e) {
                        loading.classList.add('hidden');
                        loading.classList.remove('flex');
                        container.innerHTML = '<div class="alert alert-error">Failed to fetch members</div>';
                    }
                };

                window.verifyMemberWidget = async function(memberDid) {
                    try {
                        const res = await fetch('/dashboard/ring/members/verify', {
                            method: 'POST',
                            body: new URLSearchParams({
                                ring_uri: window.atcircle.currentRingUri,
                                member_did: memberDid
                            })
                        });
                        const data = await res.json();
                        if (data.success) {
                            await window.refreshMemberList();
                        } else {
                            alert('Verification failed: ' + data.error);
                        }
                    } catch (e) {
                        alert('Failed to connect to verification server');
                    }
                };

                window.updateMemberStatus = async function(memberDid, status) {
                    try {
                        const res = await fetch('/dashboard/ring/members/update', {
                            method: 'POST',
                            body: new URLSearchParams({
                                ring_uri: window.atcircle.currentRingUri,
                                member_did: memberDid,
                                status: status
                            })
                        });
                        const data = await res.json();
                        if (data.success) {
                            // Success
                        } else {
                            alert('Error: ' + data.error);
                            await window.refreshMemberList();
                        }
                    } catch (e) {
                        alert('Failed to update member status');
                        await window.refreshMemberList();
                    }
                };

                window.kickMember = async function(memberDid, name) {
                    const msg = i18n.confirmKick.replace('{{name}}', name);
                    if (!confirm(msg)) return;

                    try {
                        const res = await fetch('/dashboard/ring/members/kick', {
                            method: 'POST',
                            body: new URLSearchParams({
                                ring_uri: window.atcircle.currentRingUri,
                                member_did: memberDid
                            })
                        });
                        const data = await res.json();
                        if (data.success) {
                            alert(i18n.kickSuccess);
                            await window.refreshMemberList();
                        } else {
                            alert('Error: ' + data.error);
                        }
                    } catch (e) {
                        alert('Failed to kick member');
                    }
                };

                window.blockMember = async function(memberDid, name) {
                    const msg = i18n.confirmBlock.replace('{{name}}', name);
                    if (!confirm(msg)) return;

                    try {
                        const res = await fetch('/dashboard/ring/members/block', {
                            method: 'POST',
                            body: new URLSearchParams({
                                ring_uri: window.atcircle.currentRingUri,
                                member_did: memberDid
                            })
                        });
                        const data = await res.json();
                        if (data.success) {
                            alert(i18n.blockSuccess);
                            await window.refreshMemberList();
                        } else {
                            alert('Error: ' + data.error);
                        }
                    } catch (e) {
                        alert('Failed to block user');
                    }
                };

                window.copyInviteLinkFromBtn = function(btn) {
                    const uri = btn.dataset.uri;
                    const url = window.location.origin + '/rings/view?ring=' + encodeURIComponent(uri);
                    navigator.clipboard.writeText(url).then(() => {
                        alert(i18n.inviteSent);
                    }).catch(err => {
                        console.error('Failed to copy: ', err);
                    });
                };

                // Join Ring
                window.openJoinModal = function(uri) {
                    const input = document.getElementById('join-ring-uri');
                    if (input) input.value = uri || '';
                    if (window.join_ring_modal) join_ring_modal.showModal();
                };

                // Invite Friends
                window.openInviteModal = async function(uri, title) {
                    window.atcircle.currentRingUri = uri;
                    window.atcircle.currentRingTitle = title;
                    window.atcircle.selectedDids.clear();
                    window.updateSelection();
                    document.getElementById('invite-modal-subtitle').textContent = uri;
                    document.getElementById('friend-search-input').value = '';
                    if (window.invite_friends_modal) invite_friends_modal.showModal();
                    await window.refreshFriendList();
                };

                window.openInviteModalFromBtn = function(btn) {
                    window.openInviteModal(btn.dataset.uri, btn.dataset.title);
                };

                window.refreshFriendList = async function() {
                    const container = document.getElementById('friend-list-container');
                    const loading = document.getElementById('friend-list-loading');
                    if (!container || !loading) return;
                    
                    container.innerHTML = '';
                    loading.classList.remove('hidden');
                    loading.classList.add('flex');

                    try {
                        const res = await fetch('/dashboard/ring/invite/friends');
                        const data = await res.json();
                        loading.classList.add('hidden');
                        loading.classList.remove('flex');

                        if (data.success) {
                            window.atcircle.allFollows = data.follows || [];
                            window.renderFriends(window.atcircle.allFollows);
                        } else {
                            container.innerHTML = '<div class="alert alert-error font-bold col-span-full">' + (data.error || 'Fetch failed') + '</div>';
                        }
                    } catch (e) {
                        loading.classList.add('hidden');
                        loading.classList.remove('flex');
                        container.innerHTML = '<div class="alert alert-error col-span-full">Failed to fetch friends</div>';
                    }
                };

                window.renderFriends = function(friends) {
                    const container = document.getElementById('friend-list-container');
                    if (!container) return;
                    container.innerHTML = '';
                    
                    if (!friends || friends.length === 0) {
                        container.innerHTML = '<div class="text-center py-8 opacity-50 italic col-span-full">No friends found.</div>';
                        return;
                    }

                    friends.forEach(f => {
                        const div = document.createElement('label');
                        div.className = 'flex items-center gap-3 p-3 bg-base-200 rounded-lg border border-base-300 cursor-pointer hover:bg-base-300 transition-colors';
                        const isChecked = window.atcircle.selectedDids.has(f.did) ? 'checked' : '';
                        div.innerHTML = '<input type="checkbox" class="checkbox checkbox-primary checkbox-sm" ' + isChecked + 
                            ' onchange="window.toggleFriendSelection(\\\'' + f.did + '\\\', this.checked)">' +
                            '<div class="flex flex-col min-w-0 flex-1">' +
                            '<span class="font-bold truncate text-sm">' + (f.displayName || f.handle) + '</span>' +
                            '<span class="text-[10px] opacity-50 truncate">@' + f.handle + '</span>' +
                            '</div>';
                        container.appendChild(div);
                    });
                };

                window.filterFriends = function() {
                    const term = document.getElementById('friend-search-input').value.toLowerCase();
                    const filtered = (window.atcircle.allFollows || []).filter(f => 
                        f.handle.toLowerCase().includes(term) || 
                        (f.displayName && f.displayName.toLowerCase().includes(term))
                    );
                    window.renderFriends(filtered);
                };

                window.toggleFriendSelection = function(did, isChecked) {
                    if (isChecked) {
                        if (window.atcircle.selectedDids.size >= 10) {
                            alert('Max 10 users can be selected at once.');
                            window.renderFriends(window.atcircle.allFollows);
                            return;
                        }
                        window.atcircle.selectedDids.add(did);
                    } else {
                        window.atcircle.selectedDids.delete(did);
                    }
                    window.updateSelection();
                };

                window.updateSelection = function() {
                    const countEl = document.getElementById('selected-count');
                    const btnEl = document.getElementById('send-invite-btn');
                    if (countEl) countEl.textContent = window.atcircle.selectedDids.size;
                    if (btnEl) btnEl.disabled = window.atcircle.selectedDids.size === 0;
                };

                window.sendInvites = function() {
                    const baseUrl = window.location.origin;
                    const ringUrl = baseUrl + '/rings/view?ring=' + encodeURIComponent(window.atcircle.currentRingUri);
                    
                    const selectedHandles = window.atcircle.allFollows
                        .filter(f => window.atcircle.selectedDids.has(f.did))
                        .map(f => '@' + f.handle)
                        .join(' ');

                    const text = i18n.inviteMessageTemplate
                        .replace('{{handles}}', selectedHandles)
                        .replace('{{title}}', window.atcircle.currentRingTitle)
                        .replace('{{url}}', ringUrl);
                    
                    const intentUrl = 'https://bsky.app/intent/compose?text=' + encodeURIComponent(text);
                    
                    window.open(intentUrl, '_blank');
                    if (window.invite_friends_modal) invite_friends_modal.close();
                };

                // Initialization
                window.addEventListener('load', () => {
                    const params = new URLSearchParams(window.location.search);
                    const ringUri = params.get('ring_uri');
                    if (ringUri) {
                        window.openJoinModal(ringUri);
                    }
                });

                console.log('ATcircle Dashboard: Script initialized successfully.');
            } catch (e) {
                console.error('ATcircle Dashboard: Script initialization failed:', e);
            }
            })();
        </script>
    `;
};
