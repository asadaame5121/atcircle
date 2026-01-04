import { html, raw } from "hono/html";

interface ScriptsProps {
    t: (key: string, options?: any) => string;
}

export const Scripts = ({ t }: ScriptsProps) => {
    return html`
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
