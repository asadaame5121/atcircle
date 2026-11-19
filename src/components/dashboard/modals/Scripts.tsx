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
                    uriCopied: t("dashboard.uri_copied"),
                }),
            )}
        </script>

        <script>
            (function() {
            try {
                console.log('ATcircle Dashboard: Initializing script...');
                
                // Load I18n
                const rawI18n = document.getElementById('i18n-data').textContent;
                const txt = document.createElement("textarea");
                txt.innerHTML = rawI18n;
                const i18n = JSON.parse(txt.value);

                // Escape untrusted values before inserting them into HTML.
                const esc = function(v) {
                    return String(v == null ? '' : v)
                        .replace(/&/g, '&amp;')
                        .replace(/</g, '&lt;')
                        .replace(/>/g, '&gt;')
                        .replace(/"/g, '&quot;')
                        .replace(/'/g, '&#39;');
                };
                // Allow only absolute http(s) URLs as link/image targets.
                const safeUrl = function(v, fallback) {
                    try {
                        const u = new URL(String(v));
                        if (u.protocol === 'http:' || u.protocol === 'https:') return u.href;
                    } catch (e) {}
                    return fallback;
                };

                // Global State
                window.atcircle = {
                    currentRingUri: '',
                    currentRingTitle: '',
                };

                // Configuration Modal
                window.openConfigModalFromBtn = function(btn) {
                    const ds = btn.dataset;
                    window.openConfigModal(ds.uri, ds.title, ds.description, ds.status, ds.acceptance, ds.admin, ds.slug, ds.banner);
                };

                window.openConfigModal = function(uri, title, description, status, acceptance, admin, slug, banner) {
                    document.getElementById('config-uri').value = uri || '';
                    document.getElementById('config-title').value = title || '';
                    document.getElementById('config-description').value = description || '';
                    document.getElementById('config-status').value = status || 'open';
                    document.getElementById('config-acceptance').value = acceptance || 'automatic';
                    document.getElementById('config-admin').value = admin || '';
                    document.getElementById('config-slug').value = slug || '';
                    document.getElementById('config-banner').value = banner || '';
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
                    loading.hidden = false;

                    try {
                        const res = await fetch('/dashboard/ring/members/list?ring_uri=' + encodeURIComponent(window.atcircle.currentRingUri));
                        const data = await res.json();
                        loading.hidden = true;

                        if (data.success) {
                            if (!data.members || data.members.length === 0) {
                                container.innerHTML = '<p class="rt-empty">' + esc(i18n.noMembers) + '</p>';
                                return;
                            }

                            data.members.forEach(m => {
                                const div = document.createElement('div');
                                div.className = 'rt-member';

                                // Member data comes from other users' records: escape everything
                                // and only allow http(s) URLs.
                                const isApproved = m.status === 'approved' ? 'selected' : '';
                                const isPending = m.status === 'pending' ? 'selected' : '';
                                const isSuspended = m.status === 'suspended' ? 'selected' : '';

                                const avatarUrl = safeUrl(m.avatar, '');
                                const siteUrl = safeUrl(m.url, '#');
                                const handle = m.handle ? '@' + m.handle : 'DID: ' + m.user_did;
                                const displayName = m.displayName || m.title || 'Unknown';

                                div.innerHTML = '<div class="rt-member-main">' +
                                    (avatarUrl
                                        ? '<img class="rt-member-avatar" src="' + esc(avatarUrl) + '" alt="" referrerpolicy="no-referrer" />'
                                        : '<span class="rt-member-avatar" aria-hidden="true">' + esc(displayName.charAt(0).toUpperCase()) + '</span>') +
                                    '<span class="rt-member-text">' +
                                    '<b>' + esc(displayName) + '</b>' +
                                    '<span class="rt-ring-meta">' + esc(handle) + '</span>' +
                                    '<a href="' + esc(siteUrl) + '" target="_blank" rel="noopener noreferrer">' + esc(m.url) + '</a>' +
                                    '<span class="rt-member-widget">' +
                                        (m.widget_installed
                                            ? '<span class="rt-tag rt-tag-auto">' + esc(i18n.widgetInstalled) + '</span>'
                                            : '<span class="rt-tag rt-tag-off">' + esc(i18n.widgetNotInstalled) + '</span>') +
                                        ' <button type="button" data-action="verify" class="rt-link-btn">' + esc(i18n.verifyNow) + '</button>' +
                                    '</span>' +
                                    '</span>' +
                                    '</div>' +
                                    '<div class="rt-member-actions">' +
                                    '<select data-action="status" class="rt-sunken rt-input" aria-label="' + esc(displayName) + '">' +
                                    '<option value="approved" ' + isApproved + '>' + esc(i18n.statusApproved) + '</option>' +
                                    '<option value="pending" ' + isPending + '>' + esc(i18n.statusPending) + '</option>' +
                                    '<option value="suspended" ' + isSuspended + '>' + esc(i18n.statusSuspended) + '</option>' +
                                    '</select>' +
                                    '<button type="button" data-action="kick" class="rt-bevel">' + esc(i18n.kick) + '</button>' +
                                    '<button type="button" data-action="block" class="rt-bevel rt-danger">' + esc(i18n.block) + '</button>' +
                                    '</div>';

                                div.querySelector('[data-action="verify"]').addEventListener('click', function() {
                                    window.verifyMemberWidget(m.user_did);
                                });
                                div.querySelector('[data-action="status"]').addEventListener('change', function() {
                                    window.updateMemberStatus(m.user_did, this.value);
                                });
                                div.querySelector('[data-action="kick"]').addEventListener('click', function() {
                                    window.kickMember(m.user_did, displayName);
                                });
                                div.querySelector('[data-action="block"]').addEventListener('click', function() {
                                    window.blockMember(m.user_did, displayName);
                                });
                                container.appendChild(div);
                            });
                        } else {
                            container.innerHTML = '<p class="rt-error">' + esc(data.error || 'Unknown error') + '</p>';
                        }
                    } catch (e) {
                        loading.hidden = true;
                        container.innerHTML = '<p class="rt-error">Failed to fetch members</p>';
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

                window.copyUriFromBtn = function(btn) {
                    const uri = btn.dataset.uri;
                    navigator.clipboard.writeText(uri).then(() => {
                        alert(i18n.uriCopied);
                    }).catch(err => {
                        console.error('Failed to copy: ', err);
                    });
                };

                // リング設定ダイアログからの削除
                window.deleteRingFromConfig = function(btn) {
                    if (!confirm(btn.dataset.confirmMessage)) return;
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
                };

                // data-confirm のあるフォームは送信前に確認する
                document.addEventListener('submit', function(e) {
                    const form = e.target;
                    if (form && form.dataset && form.dataset.confirm && !confirm(form.dataset.confirm)) {
                        e.preventDefault();
                    }
                });

                // ほかのメニューを開いたら、開いているメニューを閉じる
                document.addEventListener('click', function(e) {
                    document.querySelectorAll('details.rt-menu[open]').forEach(function(d) {
                        if (!d.contains(e.target)) d.removeAttribute('open');
                    });
                });

                console.log('ATcircle Dashboard: Script initialized successfully.');
            } catch (e) {
                console.error('ATcircle Dashboard: Script initialization failed:', e);
            }
            })();
        </script>
    `;
};
