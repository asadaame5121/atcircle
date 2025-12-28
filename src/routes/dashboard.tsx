import { Hono } from 'hono';
import { html } from 'hono/html';
import { getCookie, setCookie } from 'hono/cookie';
import { verify } from 'hono/jwt';
import { Layout } from '../components/Layout.js';
import { Bindings } from '../types/bindings.js';
import { SECRET_KEY, PUBLIC_URL } from '../config.js';
import { fetchAndDiscoverMetadata } from '../services/discovery.js';
import { createClient, restoreAgent } from '../services/oauth.js';
import { AtProtoService, RingRecord, MemberRecord } from '../services/atproto.js';
import { AtpAgent, Agent, AtUri } from '@atproto/api';
import { D1Database } from '@cloudflare/workers-types';

const app = new Hono<{ Bindings: Bindings, Variables: { jwtPayload: any } }>();

// Protected Route Middleware
app.use('*', async (c, next) => {
    const token = getCookie(c, 'session');
    if (!token) {
        const url = new URL(c.req.url);
        return c.redirect('/login?next=' + encodeURIComponent(url.pathname + url.search));
    }
    try {
        const payload = await verify(token, SECRET_KEY);
        c.set('jwtPayload', payload);
        await next();
    } catch (e) {
        return c.redirect('/login');
    }
});

app.get('/', async (c) => {
    const payload = c.get('jwtPayload');
    const did = payload.sub;

    // --- ATProto Initialization ---
    const agent = await restoreAgent(c.env.DB as any, PUBLIC_URL, did);

    // --- Data Fetching ---
    
    // 1. Fetch user's owned rings (if agent is available)
    let myRings: { uri: string; cid: string; value: RingRecord }[] = [];
    if (agent) {
       try {
           myRings = await AtProtoService.listRings(agent, did);
           console.log(`[Dashboard] Fetched ${myRings.length} rings for DID: ${did}`);
       } catch (e) {
           console.error("Failed to list rings:", e);
       }
    }

    // 2. Fetch user's memberships (sites they registered into rings)
    let myMemberships: { uri: string; cid: string; value: MemberRecord }[] = [];
    if (agent) {
        try {
            myMemberships = await AtProtoService.listMemberRecords(agent, did);
            console.log(`[Dashboard] Fetched ${myMemberships.length} memberships for DID: ${did}`);
        } catch (e) {
             console.error("Failed to list memberships:", e);
        }
    }

    // 3. Check if user already has a site (Legacy D1)
    const site = await c.env.DB.prepare("SELECT * FROM sites WHERE user_did = ?").bind(did).first() as any;

    if (site) {
        // --- Unified Data Processing ---
        const ringMap = new Map<string, {
            uri: string;
            title: string;
            description: string;
            status: string;
            acceptancePolicy: string;
            isAdmin: boolean;
            isMember: boolean;
            memberUri?: string;
            siteUrl?: string;
            pendingCount: number;
        }>();

        myRings.forEach(r => {
            ringMap.set(r.uri, {
                uri: r.uri,
                title: r.value.title,
                description: r.value.description,
                status: r.value.status,
                acceptancePolicy: r.value.acceptancePolicy || 'automatic',
                isAdmin: true,
                isMember: false,
                pendingCount: 0
            });
        });

        myMemberships.forEach(m => {
            const existing = ringMap.get(m.value.ring.uri);
            if (existing) {
                existing.isMember = true;
                existing.memberUri = m.uri;
                existing.siteUrl = m.value.url;
            } else {
                ringMap.set(m.value.ring.uri, {
                    uri: m.value.ring.uri,
                    title: m.value.title,
                    description: '',
                    status: 'unknown',
                    acceptancePolicy: 'unknown',
                    isAdmin: false,
                    isMember: true,
                    memberUri: m.uri,
                    siteUrl: m.value.url,
                    pendingCount: 0
                });
            }
        });

        // Supplement ring data from local DB (for policy and pending stats)
        for (const ring of ringMap.values()) {
            const local = await c.env.DB.prepare("SELECT acceptance_policy, status FROM rings WHERE uri = ?").bind(ring.uri).first() as any;
            if (local) {
                ring.acceptancePolicy = local.acceptance_policy;
                ring.status = local.status;
            }
            if (ring.isAdmin) {
                const pending = await c.env.DB.prepare("SELECT COUNT(*) as count FROM memberships WHERE ring_uri = ? AND status = 'pending'").bind(ring.uri).first() as { count: number };
                ring.pendingCount = pending.count;
            }
        }

        const unifiedRings = Array.from(ringMap.values());

        // Fetch actual pending members for the moderator view
        const pendingMemberships = await c.env.DB.prepare(`
            SELECT m.*, s.title as site_title, s.url as site_url, r.title as ring_title
            FROM memberships m
            JOIN sites s ON m.site_id = s.id
            JOIN rings r ON m.ring_uri = r.uri
            WHERE r.owner_did = ? AND m.status = 'pending'
        `).bind(did).all<any>();

        return c.html(Layout({
            title: 'Dashboard',
            children: html`
                <div class="card bg-base-100 shadow-xl max-w-3xl mx-auto">
                    <div class="card-body">
                        <div class="flex justify-between items-center mb-6">
                            <h1 class="card-title text-3xl">Dashboard</h1>
                            <div class="flex gap-2">
                                <button class="btn btn-primary btn-sm" onclick="create_ring_modal.showModal()">Create Ring</button>
                                <button class="btn btn-secondary btn-sm" onclick="join_ring_modal.showModal()">Join Ring</button>
                            </div>
                        </div>

                        <!-- Intro Text -->
                        <div class="bg-primary/5 p-4 rounded-lg mb-8 border border-primary/10">
                            <h2 class="font-bold text-primary mb-1 text-sm uppercase tracking-wider">How it works</h2>
                            <p class="text-sm opacity-80 leading-relaxed">
                                <strong>AT-Circle</strong> は ATProto を活用した個人サイトのためのウェブリング（コミュニティの輪）です。<br/>
                                リングを「作成」して仲間を集めたり、既存のリングに「参加」してウィジェットをサイトに設置することで、
                                同じ興味関心を持つサイト同士を繋ぐことができます。
                            </p>
                        </div>
                        
                        ${c.req.query('msg') === 'created' ? html`
                            <div class="alert alert-success mb-4">
                                <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                <span>Circle created successfully!</span>
                            </div>
                        ` : ''}
                        ${c.req.query('msg') === 'joined' ? html`
                            <div class="alert alert-success mb-4">
                                <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                <span>${c.req.query('policy') === 'manual' ? '加入許可を申請しました。' : 'Joined circle successfully!'}</span>
                            </div>
                        ` : ''}
                         ${c.req.query('msg') === 'left' ? html`
                            <div class="alert alert-info mb-4">
                                <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                <span>Left circle successfully.</span>
                            </div>
                        ` : ''}
                        ${c.req.query('msg') === 'updated' ? html`
                            <div class="alert alert-success mb-4">
                                <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                <span>Updated successfully!</span>
                            </div>
                        ` : ''}
                        ${c.req.query('msg') === 'approved' ? html`
                            <div class="alert alert-success mb-4">
                                <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                <span>Member approved!</span>
                            </div>
                        ` : ''}
                         ${c.req.query('msg') === 'rejected' ? html`
                            <div class="alert alert-info mb-4">
                                <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                <span>Member request rejected.</span>
                            </div>
                        ` : ''}
                        
                        <!-- Pending Approvals Section -->
                        ${pendingMemberships.results && pendingMemberships.results.length > 0 ? html`
                            <div class="divider">Pending Approvals</div>
                            <div class="space-y-3 mb-8">
                                ${pendingMemberships.results.map(m => html`
                                    <div class="alert bg-base-200 border-warning/30 flex justify-between items-center py-3">
                                        <div class="flex flex-col gap-0.5">
                                            <div class="text-xs font-bold text-warning uppercase tracking-tighter">Request for: ${m.ring_title}</div>
                                            <div class="font-medium">${m.site_title}</div>
                                            <div class="text-xs opacity-50 font-mono">${m.site_url}</div>
                                        </div>
                                        <div class="flex gap-2">
                                            <form action="/dashboard/ring/approve" method="POST">
                                                <input type="hidden" name="member_uri" value="${m.member_uri}" />
                                                <button type="submit" class="btn btn-success btn-xs">Approve</button>
                                            </form>
                                            <form action="/dashboard/ring/reject" method="POST" onsubmit="return confirm('Reject this request?')">
                                                <input type="hidden" name="member_uri" value="${m.member_uri}" />
                                                <button type="submit" class="btn btn-ghost btn-xs text-error">Reject</button>
                                            </form>
                                        </div>
                                    </div>
                                `)}
                            </div>
                        ` : ''}

                        <!-- Unified Rings Section -->
                        <div class="divider">My Rings</div>
                        
                        ${unifiedRings.length > 0 ? html`
                            <div class="space-y-4">
                                ${unifiedRings.map(r => html`
                                    <div class="card bg-base-200 shadow-sm border border-base-300">
                                        <div class="card-body p-5">
                                            <div class="flex justify-between items-start">
                                                <div>
                                                    <div class="flex items-center gap-2 mb-1">
                                                        <h3 class="font-bold text-lg">${r.title}</h3>
                                                        <div class="flex gap-1">
                                                            ${r.isAdmin ? html`<span class="badge badge-primary badge-outline badge-xs">Owner</span>` : ''}
                                                            ${r.isMember ? html`<span class="badge badge-secondary badge-outline badge-xs">Member</span>` : ''}
                                                            ${r.pendingCount > 0 ? html`<span class="badge badge-warning badge-xs">${r.pendingCount} Pending</span>` : ''}
                                                        </div>
                                                    </div>
                                                    <p class="text-sm opacity-70 mb-2">${r.description || html`<span class="italic opacity-50">No description</span>`}</p>
                                                    
                                                    <div class="flex flex-wrap gap-2 items-center text-xs opacity-50 font-mono">
                                                        <span>URI: ${r.uri}</span>
                                                    </div>
                                                </div>

                                                <div class="flex gap-2">
                                                    ${r.isAdmin ? html`
                                                        <button class="btn btn-ghost btn-sm btn-square" onclick="copyInviteLink('${r.uri}')" title="Copy Invite Link">
                                                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
                                                        </button>
                                                        <button class="btn btn-ghost btn-sm btn-square" onclick="openConfigModal('${r.uri}', '${r.title}', '${r.description}', '${r.status}', '${(r as any).acceptancePolicy}')" title="Configure Ring">
                                                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37a1.724 1.724 0 002.572-1.065z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                                        </button>
                                                    ` : ''}
                                                </div>
                                            </div>

                                            ${r.isMember ? html`
                                                <div class="mt-4 pt-4 border-t border-base-300 flex justify-between items-center bg-base-300/30 -mx-5 -mb-5 px-5 py-3 rounded-b-xl">
                                                    <div class="text-xs">
                                                        <span class="opacity-50">Joined as:</span> <a href="${r.siteUrl}" target="_blank" class="link hover:link-primary font-medium">${r.siteUrl}</a>
                                                    </div>
                                                    <div class="flex gap-2">
                                                        <a href="/dashboard/ring/widget?ring_uri=${encodeURIComponent(r.uri)}" class="btn btn-primary btn-xs">Widget</a>
                                                        <form action="/dashboard/ring/leave" method="POST" onsubmit="return confirm('Really leave this ring?')">
                                                            <input type="hidden" name="uri" value="${r.memberUri}" />
                                                            <button type="submit" class="btn btn-xs btn-error btn-outline">Leave</button>
                                                        </form>
                                                    </div>
                                                </div>
                                            ` : r.isAdmin ? html`
                                                <div class="mt-4 pt-4 border-t border-base-300 flex justify-end -mx-5 -mb-5 px-5 py-3 rounded-b-xl">
                                                    <button class="btn btn-secondary btn-xs" onclick="openJoinModal('${r.uri}')">Join with my site</button>
                                                </div>
                                            ` : ''}
                                        </div>
                                    </div>
                                `)}
                            </div>
                        ` : html`
                            <div class="text-center py-12 bg-base-200 rounded-xl border-2 border-dashed border-base-300">
                                <p class="opacity-50 italic mb-4">You haven't joined or created any rings yet.</p>
                                <div class="flex justify-center gap-4">
                                    <button class="btn btn-primary btn-sm" onclick="create_ring_modal.showModal()">Create First Ring</button>
                                    <button class="btn btn-secondary btn-sm" onclick="join_ring_modal.showModal()">Join a Ring</button>
                                </div>
                            </div>
                        `}

                        <!-- Existing Legacy Site Section -->
                         <div class="divider">Legacy</div>
                        <div class="bg-base-200 p-6 rounded-lg mb-6 opacity-75">
                            <h2 class="text-xl font-bold mb-4">Your Registered Site (Legacy)</h2>
                            <div class="space-y-2">
                                <p><span class="font-semibold">Title:</span> ${site.title}</p>
                                <p><span class="font-semibold">URL:</span> <a href="${site.url}" target="_blank" class="link link-primary">${site.url}</a></p>
                                ${site.rss_url ? html`<p><span class="font-semibold">RSS:</span> ${site.rss_url}</p>` : ''}
                                <p><span class="font-semibold">Status:</span> 
                                    <span class="badge ${site.is_active ? 'badge-success' : 'badge-ghost'}">${site.is_active ? 'Active' : 'Inactive'}</span>
                                </p>
                            </div>
                            <div class="card-actions mt-6">
                                <a href="/dashboard/edit" class="btn btn-success btn-sm">Edit Site</a>
                                <a href="/dashboard/debug" class="btn btn-ghost btn-xs opacity-50">Inspector</a>
                            </div>
                        </div>

                        <div class="flex flex-col gap-4 mt-8">
                            <form action="/dashboard/sync" method="POST">
                                <button type="submit" class="btn btn-outline btn-info w-full">Sync from PDS</button>
                                <p class="text-xs opacity-50 text-center mt-2">Update local DB using your PDS records.</p>
                            </form>

                            <form action="/logout" method="POST" class="text-center mt-4">
                                <button type="submit" class="btn btn-error btn-outline">Logout</button>
                            </form>
                        </div>
                    </div>
                </div>

                <!-- Create Ring Modal -->
                <dialog id="create_ring_modal" class="modal">
                    <div class="modal-box">
                        <h3 class="font-bold text-lg">Create a Circle</h3>
                        <form action="/dashboard/ring/create" method="POST" class="mt-4">
                            <div class="form-control w-full mb-4">
                                <label class="label"><span class="label-text">Ring Name</span></label>
                                <input type="text" name="title" required class="input input-bordered w-full" placeholder="e.g. The Indie Circle" />
                            </div>
                             <div class="form-control w-full mb-4">
                                <label class="label"><span class="label-text">Description</span></label>
                                <textarea name="description" class="textarea textarea-bordered h-24" placeholder="What keeps this ring together?"></textarea>
                            </div>
                            <div class="modal-action">
                                <button type="button" class="btn" onclick="create_ring_modal.close()">Cancel</button>
                                <button type="submit" class="btn btn-primary">Create</button>
                            </div>
                        </form>
                    </div>
                     <form method="dialog" class="modal-backdrop">
                        <button>close</button>
                    </form>
                </dialog>

                 <!-- Join Ring Modal -->
                <dialog id="join_ring_modal" class="modal">
                    <div class="modal-box">
                        <h3 class="font-bold text-lg">Join a Webring</h3>
                        <form action="/dashboard/ring/join" method="POST" class="mt-4">
                             <div class="form-control w-full mb-4">
                                <label class="label"><span class="label-text">Ring URI</span></label>
                                <input type="text" name="ring_uri" id="join-ring-uri" required class="input input-bordered w-full font-mono text-sm" placeholder="at://did:plc:.../net.asadaame5121.at-circle.ring/..." />
                            </div>
                            <div class="divider">Your Site Details</div>
                             <div class="form-control w-full mb-4">
                                <label class="label"><span class="label-text">Site URL</span></label>
                                <input type="url" name="url" required class="input input-bordered w-full" value="${site.url}" />
                            </div>
                             <div class="form-control w-full mb-4">
                                <label class="label"><span class="label-text">Site Title</span></label>
                                <input type="text" name="title" required class="input input-bordered w-full" value="${site.title}" />
                            </div>
                             <div class="form-control w-full mb-4">
                                <label class="label"><span class="label-text">RSS (Optional)</span></label>
                                <input type="url" name="rss" class="input input-bordered w-full" value="${site.rss_url || ''}" />
                            </div>
                            <div class="modal-action">
                                <button type="button" class="btn" onclick="join_ring_modal.close()">Cancel</button>
                                <button type="submit" class="btn btn-secondary">Join</button>
                            </div>
                        </form>
                    </div>
                     <form method="dialog" class="modal-backdrop">
                        <button>close</button>
                    </form>
                </dialog>

                <div class="card bg-base-100 shadow-xl max-w-2xl mx-auto mt-12 border-2 border-error">
                    <div class="card-body">
                        <h2 class="card-title text-error">Danger Zone</h2>
                        <p>Once you leave the Webring, your site and account information will be permanently deleted. This action cannot be undone.</p>
                        <div class="card-actions justify-end mt-4">
                            <button class="btn btn-error" onclick="leave_modal.showModal()">Leave Webring</button>
                        </div>
                    </div>
                </div>

                <dialog id="leave_modal" class="modal">
                    <div class="modal-box">
                        <h3 class="font-bold text-lg text-error">Warning!</h3>
                        <p class="py-4">Are you sure you want to leave the Webring? Your account and site registration will be permanently deleted.</p>
                        <div class="modal-action">
                            <form method="dialog">
                                <button class="btn btn-ghost">Cancel</button>
                            </form>
                            <form action="/dashboard/leave" method="POST">
                                <button class="btn btn-error">Yes, delete my account</button>
                            </form>
                        </div>
                    </div>
                    <form method="dialog" class="modal-backdrop">
                        <button>close</button>
                    </form>
                </dialog>

                <!-- Circle Config Modal -->
                <dialog id="circle_config_modal" class="modal">
                    <div class="modal-box">
                        <h3 class="font-bold text-lg">Circle Configuration</h3>
                        <form action="/dashboard/ring/update" method="POST" class="mt-4">
                            <input type="hidden" name="uri" id="config-uri" />
                            
                            <div class="form-control w-full mb-4">
                                <label class="label"><span class="label-text">Title</span></label>
                                <input type="text" name="title" id="config-title" required class="input input-bordered w-full" />
                            </div>

                            <div class="form-control w-full mb-4">
                                <label class="label"><span class="label-text">Description</span></label>
                                <textarea name="description" id="config-description" class="textarea textarea-bordered h-24"></textarea>
                            </div>

                            <div class="grid grid-cols-2 gap-4">
                                <div class="form-control">
                                    <label class="label"><span class="label-text">Status (Public)</span></label>
                                    <select name="status" id="config-status" class="select select-bordered w-full">
                                        <option value="open">OPEN (Recruiting)</option>
                                        <option value="closed">CLOSED (Full)</option>
                                    </select>
                                </div>
                                <div class="form-control">
                                    <label class="label"><span class="label-text">Acceptance Policy</span></label>
                                    <select name="acceptance_policy" id="config-acceptance" class="select select-bordered w-full">
                                        <option value="manual">MANUAL (Needs Approval)</option>
                                        <option value="automatic">AUTOMATIC (Auto-accept)</option>
                                    </select>
                                </div>
                            </div>

                            <div class="modal-action">
                                <button type="button" class="btn" onclick="circle_config_modal.close()">Cancel</button>
                                <button type="submit" class="btn btn-primary">Save Changes</button>
                            </div>
                        </form>
                    </div>
                    <form method="dialog" class="modal-backdrop">
                        <button>close</button>
                    </form>
                </dialog>

                <script>
                    function openConfigModal(uri, title, description, status, acceptance) {
                        document.getElementById('config-uri').value = uri;
                        document.getElementById('config-title').value = title;
                        document.getElementById('config-description').value = description;
                        document.getElementById('config-status').value = status;
                        document.getElementById('config-acceptance').value = acceptance || 'automatic';
                        circle_config_modal.showModal();
                    }

                    function openJoinModal(uri) {
                        document.getElementById('join-ring-uri').value = uri;
                        join_ring_modal.showModal();
                    }

                    function copyInviteLink(ringUri) {
                        const baseUrl = window.location.origin;
                        const inviteUrl = \`\${baseUrl}/rings/view?ring=\${encodeURIComponent(ringUri)}\`;
                        navigator.clipboard.writeText(inviteUrl).then(() => {
                            alert('Invite link copied to clipboard!');
                        });
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
            `
        }));
    }

    // 2. Auto-Discovery Flow
    let detectedSites: Array<{url: string, title?: string, rss?: string}> = [];
    let discoveryStatus = '';

    try {
        const profileRes = await fetch(`https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile?actor=${did}`);
        if (profileRes.ok) {
            const profile = await profileRes.json() as { description?: string };
            const desc = profile.description || '';
            const urlMatches = desc.matchAll(/https?:\/\/[^\s]+/g);
            
            const urls = Array.from(urlMatches, m => m[0]);
            
            if (urls.length > 0) {
                discoveryStatus = `Found ${urls.length} URL(s) in your profile!`;
                
                // Fetch metadata for up to 3 URLs to avoid timeout
                for (const url of urls.slice(0, 3)) {
                    try {
                        const meta = await fetchAndDiscoverMetadata(url);
                        if (meta) {
                             const rss = meta.feeds.length > 0 ? meta.feeds[0].url : '';
                             detectedSites.push({ url: meta.url, title: meta.title, rss });
                        } else {
                             detectedSites.push({ url });
                        }
                    } catch (e) {
                        console.error(`Failed to fetch metadata for ${url}`, e);
                        detectedSites.push({ url });
                    }
                }
            } else {
                discoveryStatus = 'No URL found in your BlueSky profile.';
            }
        }
    } catch (e) {
        console.error("Auto-discovery failed", e);
        discoveryStatus = 'Failed to check profile.';
    }

    const defaultSite = detectedSites.length > 0 ? detectedSites[0] : { url: '', title: '', rss: '' };

    return c.html(Layout({
        title: 'Register Site',
        children: html`
            <div class="card bg-base-100 shadow-xl max-w-2xl mx-auto">
                <div class="card-body">
                    <h1 class="card-title text-3xl mb-4 text-center justify-center">Register Your Site</h1>
                    <p class="text-center mb-6 opacity-75">To join the Webring, please register your website.</p>
                    
                    ${discoveryStatus ? html`
                        <div class="alert alert-info mb-6">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-current shrink-0 w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                            <span>${discoveryStatus}</span>
                        </div>
                    ` : ''}

                    <form action="/dashboard/site" method="POST" id="registerForm">
                        
                        ${detectedSites.length > 1 ? html`
                            <div class="form-control mb-6">
                                <label class="label">
                                    <span class="label-text font-bold">Detected Sites</span>
                                </label>
                                <div class="space-y-2">
                                    ${detectedSites.map((site, index) => html`
                                        <label class="label cursor-pointer justify-start gap-4 border p-3 rounded-lg hover:bg-base-200 transition-colors">
                                            <input type="radio" name="site_selection" class="radio radio-primary" 
                                                value="${index}" 
                                                ${index === 0 ? 'checked' : ''}
                                                onchange="selectSite(${index})"
                                            />
                                            <div class="flex-1">
                                                <div class="font-bold">${site.url}</div>
                                                ${site.title ? html`<div class="text-xs opacity-70">${site.title}</div>` : ''}
                                            </div>
                                        </label>
                                    `)}
                                    <label class="label cursor-pointer justify-start gap-4 border p-3 rounded-lg hover:bg-base-200 transition-colors">
                                        <input type="radio" name="site_selection" class="radio radio-primary" value="-1" onchange="clearForm()" />
                                        <span class="font-bold">Enter Manually</span>
                                    </label>
                                </div>
                            </div>
                        ` : ''}

                        <div class="form-control w-full mb-4">
                            <label class="label">
                                <span class="label-text font-bold">Site URL</span>
                            </label>
                            <input type="url" name="url" id="url" required value="${defaultSite.url}" class="input input-bordered w-full" />
                        </div>

                        <div class="form-control w-full mb-4">
                            <label class="label">
                                <span class="label-text font-bold">Site Title</span>
                            </label>
                            <input type="text" name="title" id="title" required value="${defaultSite.title || ''}" class="input input-bordered w-full" />
                        </div>

                         <div class="form-control w-full mb-4">
                            <label class="label">
                                <span class="label-text font-bold">Description</span>
                            </label>
                            <textarea name="description" class="textarea textarea-bordered h-24"></textarea>
                        </div>

                        <div class="form-control w-full mb-8">
                            <label class="label">
                                <span class="label-text font-bold">RSS Feed URL (Optional)</span>
                            </label>
                            <input type="url" name="rss_url" id="rss_url" value="${defaultSite.rss || ''}" class="input input-bordered w-full" placeholder="https://example.com/feed.xml" />
                        </div>

                        <div class="card-actions justify-center flex-col gap-4">
                            <button type="submit" class="btn btn-primary w-full text-lg">Register Site</button>
                             <div class="text-center w-full">
                                <a href="/logout" class="link link-hover text-sm">Logout</a>
                            </div>
                        </div>
                    </form>
                </div>
            </div>

            <script>
                const sites = ${JSON.stringify(detectedSites)};
                
                function selectSite(index) {
                    const site = sites[index];
                    document.getElementById('url').value = site.url || '';
                    document.getElementById('title').value = site.title || '';
                    document.getElementById('rss_url').value = site.rss || '';
                }

                function clearForm() {
                    document.getElementById('url').value = '';
                    document.getElementById('title').value = '';
                    document.getElementById('rss_url').value = '';
                }
            </script>
        `
    }));
});

app.get('/edit', async (c) => {
    const payload = c.get('jwtPayload');
    const did = payload.sub;
    const site = await c.env.DB.prepare("SELECT * FROM sites WHERE user_did = ?").bind(did).first();

    if (!site) {
        return c.redirect('/dashboard');
    }

    return c.html(Layout({
        title: 'Edit Site',
        children: html`
            <div class="card bg-base-100 shadow-xl max-w-2xl mx-auto">
                <div class="card-body">
                    <h1 class="card-title text-3xl mb-6">Edit Your Site</h1>
                    <form action="/dashboard/site/update" method="POST">
                        <div class="form-control w-full mb-4">
                            <label class="label">
                                <span class="label-text font-bold">Site URL</span>
                            </label>
                            <input type="url" name="url" required value="${site.url}" class="input input-bordered w-full" />
                        </div>

                        <div class="form-control w-full mb-4">
                            <label class="label">
                                <span class="label-text font-bold">Site Title</span>
                            </label>
                            <input type="text" name="title" required value="${site.title}" class="input input-bordered w-full" />
                        </div>

                         <div class="form-control w-full mb-4">
                            <label class="label">
                                <span class="label-text font-bold">Description</span>
                            </label>
                            <textarea name="description" class="textarea textarea-bordered h-24">${site.description || ''}</textarea>
                        </div>

                        <div class="form-control w-full mb-6">
                            <label class="label">
                                <span class="label-text font-bold">RSS Feed URL (Optional)</span>
                            </label>
                            <input type="url" name="rss_url" value="${site.rss_url || ''}" class="input input-bordered w-full" />
                        </div>

                        <div class="card-actions justify-end gap-4">
                            <a href="/dashboard" class="btn btn-ghost">Cancel</a>
                            <button type="submit" class="btn btn-primary">Update Site</button>
                        </div>
                    </form>
                </div>
            </div>
            
            <div class="card bg-base-200 shadow-inner mt-8 max-w-2xl mx-auto">
                <div class="card-body">
                    <h2 class="card-title">Embed Widget</h2>
                    <p class="text-sm opacity-75 mb-4">Customize the look and feel of your widget.</p>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <!-- Theme Selection -->
                        <div class="form-control">
                            <label class="label"><span class="label-text">Theme</span></label>
                            <select id="widget-theme" class="select select-bordered w-full" onchange="updateWidgetCode()">
                                <option value="system">System (Auto)</option>
                                <option value="light">Light</option>
                                <option value="dark">Dark</option>
                            </select>
                        </div>

                        <!-- Layout Selection -->
                        <div class="form-control">
                            <label class="label"><span class="label-text">Layout</span></label>
                            <select id="widget-layout" class="select select-bordered w-full" onchange="updateWidgetCode()">
                                <option value="default">Default (Banner)</option>
                                <option value="compact">Compact (Grid)</option>
                            </select>
                        </div>

                        <!-- Transparency -->
                        <div class="form-control">
                            <label class="label cursor-pointer justify-start gap-4">
                                <input type="checkbox" id="widget-transparent" class="checkbox" onchange="updateWidgetCode()">
                                <span class="label-text">Transparent Background</span>
                            </label>
                        </div>
                    </div>

                    <!-- Data for JS -->
                    <div id="widget-data" 
                        data-site-url="${site.url}" 
                        data-base-url="${new URL(c.req.url).origin}"
                        class="hidden"></div>

                    <div class="mockup-code bg-neutral text-neutral-content relative group">
                        <pre class="whitespace-pre-wrap"><code id="widget-code"></code></pre>
                        <button class="btn btn-circle btn-ghost btn-xs absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity" onclick="copyWidgetCode()" title="Copy to clipboard">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
                        </button>
                    </div>
                </div>
            </div>

            <script>
                function updateWidgetCode() {
                    const theme = document.getElementById('widget-theme').value;
                    const layout = document.getElementById('widget-layout').value;
                    const transparent = document.getElementById('widget-transparent').checked;
                    
                    const dataEl = document.getElementById('widget-data');
                    if (!dataEl) return;

                    const siteUrl = dataEl.dataset.siteUrl;
                    const baseUrl = dataEl.dataset.baseUrl;

                    let tag = '<webring-nav site="' + siteUrl + '"';
                    if (theme !== 'system') tag += ' theme="' + theme + '"';
                    if (layout !== 'default') tag += ' layout="' + layout + '"';
                    if (transparent) tag += ' transparent';
                    tag += '></webring-nav>';

                    const script = '<script src="' + baseUrl + '/nav/widget.js"><' + '/script>';
                    
                    document.getElementById('widget-code').textContent = script + '\\n' + tag;
                }

                function copyWidgetCode() {
                    const code = document.getElementById('widget-code').textContent;
                    navigator.clipboard.writeText(code).then(() => {
                        alert('Copied to clipboard!');
                    });
                }

                // Init
                window.addEventListener('load', updateWidgetCode);
            </script>
        `
    }));
});

app.get('/debug', async (c) => {
    const payload = c.get('jwtPayload');
    const did = payload.sub;
    const agent = await restoreAgent(c.env.DB as any, PUBLIC_URL, did);
    if (!agent) return c.redirect('/login');

    const rings = await AtProtoService.listRings(agent, did);
    const members = await AtProtoService.listMemberRecords(agent, did);

    return c.html(Layout({
        title: 'PDS Inspector',
        children: html`
            <div class="max-w-4xl mx-auto">
                <div class="flex justify-between items-center mb-6">
                    <h1 class="text-3xl font-bold">PDS Inspector</h1>
                    <a href="/dashboard" class="btn btn-ghost btn-sm">Back to Dashboard</a>
                </div>

                <div class="space-y-8">
                    <section class="card bg-base-100 shadow-xl">
                        <div class="card-body">
                            <h2 class="card-title text-primary text-2xl mb-4">Ring Records (${NSID.RING})</h2>
                            ${rings.length > 0 ? html`
                                <div class="space-y-4">
                                    ${rings.map(r => html`
                                        <div class="collapse collapse-arrow bg-base-200">
                                            <input type="checkbox" />
                                            <div class="collapse-title font-mono text-sm break-all font-bold">
                                                ${r.uri}
                                            </div>
                                            <div class="collapse-content">
                                                <pre class="bg-neutral text-neutral-content p-4 rounded-lg overflow-x-auto text-xs mt-2"><code>${JSON.stringify(r.value, null, 2)}</code></pre>
                                            </div>
                                        </div>
                                    `)}
                                </div>
                            ` : html`<p class="italic opacity-50">No ring records found in your PDS repo.</p>`}
                        </div>
                    </section>

                    <section class="card bg-base-100 shadow-xl">
                        <div class="card-body">
                            <h2 class="card-title text-secondary text-2xl mb-4">Member Records (${NSID.MEMBER})</h2>
                            ${members.length > 0 ? html`
                                <div class="space-y-4">
                                    ${members.map(m => html`
                                        <div class="collapse collapse-arrow bg-base-200">
                                            <input type="checkbox" />
                                            <div class="collapse-title font-mono text-sm break-all font-bold">
                                                ${m.uri}
                                            </div>
                                            <div class="collapse-content">
                                                <pre class="bg-neutral text-neutral-content p-4 rounded-lg overflow-x-auto text-xs mt-2"><code>${JSON.stringify(m.value, null, 2)}</code></pre>
                                            </div>
                                        </div>
                                    `)}
                                </div>
                            ` : html`<p class="italic opacity-50">No member records found in your PDS repo.</p>`}
                        </div>
                    <section class="card bg-base-100 shadow-xl border-2 border-accent/20">
                        <div class="card-body">
                            <h2 class="card-title text-accent text-2xl mb-4">Development Tools</h2>
                            <div class="bg-base-200 p-6 rounded-lg">
                                <p class="mb-4 text-sm font-bold text-error">⚠️ Admin Only: Triggers global background tasks</p>
                                <button onclick="manualFeedSync(this)" class="btn btn-accent w-full">Refresh All RSS Feeds</button>
                                <p class="text-xs opacity-50 mt-2 text-center">Fetching RSS feeds for every site in the DB. Limited to once every 5 mins.</p>
                            </div>
                        </div>
                    </section>
                </div>
            </div>

            <script>
                async function manualFeedSync(btn) {
                    const originalText = btn.innerText;
                    btn.disabled = true;
                    btn.innerText = 'Refreshing...';
                    try {
                        const res = await fetch('/dashboard/sync/feeds', { method: 'POST' });
                        const data = await res.json();
                        if (data.skipped) {
                            alert('Wait: Too frequent. Next sync possible at ' + data.nextPossibleAt);
                        } else if (data.success) {
                            alert('Success! Added ' + data.added + ' new items.');
                            window.location.reload();
                        } else {
                            alert('Failed: ' + data.error);
                        }
                    } catch (e) {
                        alert('Error: ' + e);
                    } finally {
                        btn.disabled = false;
                        btn.innerText = originalText;
                    }
                }
            </script>
        `
    }));
});

const NSID = {
    RING: "net.asadaame5121.at-circle.ring",
    MEMBER: "net.asadaame5121.at-circle.member",
};

app.post('/sync', async (c) => {
    const payload = c.get('jwtPayload');
    const did = payload.sub;
    const agent = await restoreAgent(c.env.DB as any, PUBLIC_URL, did);
    if (!agent) return c.redirect('/login');

    try {
        // 1. Sync Rings
        const rings = await AtProtoService.listRings(agent, did);
        for (const r of rings) {
            await c.env.DB.prepare(
                "INSERT OR REPLACE INTO rings (uri, owner_did, title, description) VALUES (?, ?, ?, ?)"
            ).bind(r.uri, did, r.value.title, r.value.description || null).run();
        }

        // 2. Sync Memberships
        const members = await AtProtoService.listMemberRecords(agent, did);
        const mySite = await c.env.DB.prepare("SELECT id FROM sites WHERE user_did = ?").bind(did).first() as { id: number };
        
        if (mySite) {
            for (const m of members) {
                // Ensure the referenced ring is also in our local DB
                const ringUri = m.value.ring.uri;
                const existingRing = await c.env.DB.prepare("SELECT uri FROM rings WHERE uri = ?").bind(ringUri).first();
                if (!existingRing) {
                    try {
                        const ringData = await AtProtoService.getRing(agent, ringUri);
                        await c.env.DB.prepare(
                            "INSERT OR IGNORE INTO rings (uri, owner_did, title, description) VALUES (?, ?, ?, ?)"
                        ).bind(ringUri, new AtUri(ringUri).hostname, ringData.value.title, ringData.value.description || null).run();
                    } catch (e) {
                        console.error(`Failed to fetch missing ring ${ringUri} during sync:`, e);
                    }
                }

                await c.env.DB.prepare(
                    "INSERT OR REPLACE INTO memberships (ring_uri, site_id, member_uri) VALUES (?, ?, ?)"
                ).bind(ringUri, mySite.id, m.uri).run();
            }
        }
        
    } catch (e) {
        console.error("Sync failed:", e);
        return c.text('Sync failed: ' + (e as any).message, 500);
    }

    return c.redirect('/dashboard?msg=updated');
});

app.post('/site', async (c) => {
    const payload = c.get('jwtPayload');
    const did = payload.sub;
    const body = await c.req.parseBody();

    const url = body['url'] as string;
    const title = body['title'] as string;
    const description = body['description'] as string;
    const rss_url = body['rss_url'] as string;

    if (!url || !title) {
        return c.text('URL and Title are required', 400);
    }

    await c.env.DB.prepare(
        "INSERT INTO sites (user_did, url, title, description, rss_url) VALUES (?, ?, ?, ?, ?)"
    ).bind(did, url, title, description, rss_url || null).run();

    return c.redirect('/dashboard');
});

app.post('/site/update', async (c) => {
    const payload = c.get('jwtPayload');
    const did = payload.sub;
    const body = await c.req.parseBody();

    const url = body['url'] as string;
    const title = body['title'] as string;
    const description = body['description'] as string;
    const rss_url = body['rss_url'] as string;

    if (!url || !title) {
        return c.text('URL and Title are required', 400);
    }

    await c.env.DB.prepare(
        "UPDATE sites SET url = ?, title = ?, description = ?, rss_url = ? WHERE user_did = ?"
    ).bind(url, title, description, rss_url || null, did).run();

    return c.redirect('/dashboard');
});

app.post('/leave', async (c) => {
    const payload = c.get('jwtPayload');
    const did = payload.sub;

    // Delete site and user record
    await c.env.DB.batch([
        c.env.DB.prepare("DELETE FROM sites WHERE user_did = ?").bind(did),
        c.env.DB.prepare("DELETE FROM users WHERE did = ?").bind(did)
    ]);

    // Clear session
    setCookie(c, "session", "", {
        path: "/",
        maxAge: 0,
    });

    return c.redirect('/');
});


// --- ATProto Action Handlers ---

app.post('/ring/create', async (c) => {
    const payload = c.get('jwtPayload');
    const did = payload.sub;
    const body = await c.req.parseBody();
    const title = body['title'] as string;
    const description = body['description'] as string;

    if (!title) return c.text('Title required', 400);

    try {
        const agent = await restoreAgent(c.env.DB as any, PUBLIC_URL, did);
        if (!agent) return c.redirect('/login');

        const ringUri = await AtProtoService.createRing(agent, title, description);

        // 1. Save to local DB
        await c.env.DB.prepare(
            "INSERT INTO rings (uri, owner_did, title, description) VALUES (?, ?, ?, ?)"
        ).bind(ringUri, did, title, description).run();

        // 2. UX Improvement: Auto-join my own site
        const mySite = await c.env.DB.prepare("SELECT * FROM sites WHERE user_did = ?").bind(did).first() as any;
        if (mySite && ringUri) {
            console.log(`[AutoJoin] Automatically joining ${did}'s site to new ring ${ringUri}`);
            try {
                const memberUri = await AtProtoService.joinRing(agent, ringUri, {
                    url: mySite.url,
                    title: mySite.title,
                    rss: mySite.rss_url || ''
                });

                // Save membership locally
                await c.env.DB.prepare(
                    "INSERT INTO memberships (ring_uri, site_id, member_uri) VALUES (?, ?, ?)"
                ).bind(ringUri, mySite.id, memberUri).run();

            } catch (joinError) {
                console.error("Failed to auto-join ring:", joinError);
            }
        }

    } catch (e) {
        console.error("Error creating ring:", e);
        return c.text('Failed to create ring', 500);
    }

    return c.redirect('/dashboard?msg=created');
});

app.post('/ring/join', async (c) => {
    const payload = c.get('jwtPayload');
    const did = payload.sub;
    const body = await c.req.parseBody();
    const ringUri = (body['ring_uri'] as string || '').trim();
    const url = body['url'] as string;
    const title = body['title'] as string;
    const rss = body['rss'] as string;

    if (!ringUri || !url || !title) return c.text('Missing required fields', 400);

    try {
        const agent = await restoreAgent(c.env.DB as any, PUBLIC_URL, did);
        if (!agent) return c.redirect('/login');

        // 1. Fetch Ring Metadata and Save/Update locally
        let acceptancePolicy = 'automatic';
        try {
            const ringData = await AtProtoService.getRing(agent, ringUri);
            acceptancePolicy = ringData.value.acceptancePolicy || 'automatic';
            
            await c.env.DB.prepare(
                "INSERT OR REPLACE INTO rings (uri, owner_did, title, description, acceptance_policy, status) VALUES (?, ?, ?, ?, ?, ?)"
            ).bind(
                ringUri, 
                new AtUri(ringUri).hostname, 
                ringData.value.title, 
                ringData.value.description || null,
                acceptancePolicy,
                ringData.value.status || 'open'
            ).run();
        } catch (ringError) {
            console.error(`Failed to fetch ring metadata during join for URI: ${ringUri}`, ringError);
            // Fallback to local DB if available
            const localRing = await c.env.DB.prepare("SELECT acceptance_policy FROM rings WHERE uri = ?").bind(ringUri).first() as any;
            if (localRing) {
                console.log(`Fallback to local DB found policy: ${localRing.acceptance_policy}`);
                acceptancePolicy = localRing.acceptance_policy;
            } else {
                console.log("No local ring found for fallback, defaulting to automatic");
            }
        }

        console.log(`Proceeding to join ring: ${ringUri} with policy: ${acceptancePolicy}`);
        const memberUri = await AtProtoService.joinRing(agent, ringUri, { url, title, rss });
        console.log(`Joined ring successfully! Member record URI: ${memberUri}`);
        const initialStatus = acceptancePolicy === 'manual' ? 'pending' : 'approved';

        // 2. Save membership locally
        const mySite = await c.env.DB.prepare("SELECT id FROM sites WHERE user_did = ?").bind(did).first() as { id: number };
        if (mySite) {
            await c.env.DB.prepare(
                "INSERT OR IGNORE INTO memberships (ring_uri, site_id, member_uri, status) VALUES (?, ?, ?, ?)"
            ).bind(ringUri, mySite.id, memberUri, initialStatus).run();
        }
    } catch (e) {
        console.error("Error joining ring:", e);
        return c.text('Failed to join ring', 500);
    }

    return c.redirect(`/dashboard?msg=joined&policy=\${acceptancePolicy}`);
});

app.post('/ring/leave', async (c) => {
    const payload = c.get('jwtPayload');
    const did = payload.sub;
    const body = await c.req.parseBody();
    const uri = body['uri'] as string; // URI of the member record

    if (!uri) return c.text('URI required', 400);

    try {
        const agent = await restoreAgent(c.env.DB as any, PUBLIC_URL, did);
        if (!agent) return c.redirect('/login');

        await AtProtoService.leaveRing(agent, uri);

        // Remove membership locally
        await c.env.DB.prepare("DELETE FROM memberships WHERE member_uri = ?").bind(uri).run();
    } catch (e) {
        console.error("Error leaving ring:", e);
        return c.text('Failed to leave ring', 500);
    }

    return c.redirect('/dashboard?msg=left');
});

app.post('/ring/update', async (c) => {
    const payload = c.get('jwtPayload');
    const did = payload.sub;
    const body = await c.req.parseBody();
    const uri = body['uri'] as string;
    const title = body['title'] as string;
    const description = body['description'] as string;
    const status = body['status'] as ("open" | "closed");
    const acceptance = body['acceptance_policy'] as ("automatic" | "manual");

    if (!uri || !title || !status || !acceptance) return c.text('Missing required fields', 400);

    try {
        const agent = await restoreAgent(c.env.DB as any, PUBLIC_URL, did);
        if (!agent) return c.redirect('/login');

        // 1. Update Repository (ATProto)
        await AtProtoService.updateRing(agent, uri, title, description, status, acceptance);

        // 2. Update AppView (Indexer)
        await c.env.DB.prepare(
            "UPDATE rings SET acceptance_policy = ?, status = ? WHERE uri = ?"
        ).bind(acceptance, status, uri).run();

    } catch (e) {
        console.error("Error updating circle:", e);
        return c.text('Failed to update circle', 500);
    }

    return c.redirect('/dashboard');
});

app.post('/ring/approve', async (c) => {
    const payload = c.get('jwtPayload');
    const did = payload.sub;
    const body = await c.req.parseBody();
    const memberUri = body['member_uri'] as string;

    if (!memberUri) return c.text('Member URI required', 400);

    // Verify ownership
    const membership = await c.env.DB.prepare(`
        SELECT m.id, r.owner_did 
        FROM memberships m 
        JOIN rings r ON m.ring_uri = r.uri 
        WHERE m.member_uri = ?
    `).bind(memberUri).first() as { id: number, owner_did: string };

    if (!membership || membership.owner_did !== did) {
        return c.text('Unauthorized or membership not found', 403);
    }

    await c.env.DB.prepare("UPDATE memberships SET status = 'approved' WHERE id = ?").bind(membership.id).run();

    return c.redirect('/dashboard?msg=approved');
});

app.post('/ring/reject', async (c) => {
    const payload = c.get('jwtPayload');
    const did = payload.sub;
    const body = await c.req.parseBody();
    const memberUri = body['member_uri'] as string;

    if (!memberUri) return c.text('Member URI required', 400);

    // Verify ownership
    const membership = await c.env.DB.prepare(`
        SELECT m.id, r.owner_did 
        FROM memberships m 
        JOIN rings r ON m.ring_uri = r.uri 
        WHERE m.member_uri = ?
    `).bind(memberUri).first() as { id: number, owner_did: string };

    if (!membership || membership.owner_did !== did) {
        return c.text('Unauthorized or membership not found', 403);
    }

    // Rejecting means deleting the membership record locally
    // Note: We don't delete the record from the user's PDS as we don't have write access to their repo.
    // They can still "leave" or "delete" it from their end.
    await c.env.DB.prepare("DELETE FROM memberships WHERE id = ?").bind(membership.id).run();

    return c.redirect('/dashboard?msg=rejected');
});

export default app;
