import { normalizeWebUrl } from "../lib/navigation-session.js";
import { type PublicRecords, publicRecords } from "./public-records.js";

export interface ProfileLinkCandidate {
    url: string;
    title?: string;
    /** 元の app.bsky.actor.link レコード (site.link に記録する) */
    link?: { uri: string; cid: string };
}

const MAX_LINKS = 10;

/**
 * Bluesky プロフィールに載せているサイトを、サイト登録の候補として返す。
 *
 * app.bsky.actor.profile の `links` (app.bsky.actor.link への参照、表示順) を
 * 優先し、なければ非推奨の `website` を使う。Bluesky 側のレコードは読むだけ。
 */
export async function discoverProfileLinks(
    did: string,
    records: PublicRecords = publicRecords,
): Promise<ProfileLinkCandidate[]> {
    interface ProfileValue {
        links?: { uri?: string }[];
        website?: string;
    }
    let profile: ProfileValue | null = null;
    try {
        const rec = await records.getRecord<ProfileValue>(
            `at://${did}/app.bsky.actor.profile/self`,
        );
        profile = rec?.value ?? null;
    } catch {
        return [];
    }
    if (!profile) return [];

    const ownLinkPrefix = `at://${did}/app.bsky.actor.link/`;
    const refs = (profile.links ?? [])
        .map((l) => l?.uri)
        .filter((uri): uri is string => !!uri?.startsWith(ownLinkPrefix))
        .slice(0, MAX_LINKS);

    const candidates: ProfileLinkCandidate[] = [];
    for (const uri of refs) {
        try {
            const rec = await records.getRecord<{
                url?: string;
                title?: string;
            }>(uri);
            const url = normalizeWebUrl(rec?.value.url);
            if (!rec || !url) continue;
            candidates.push({
                url,
                title: rec.value.title || undefined,
                link: { uri: rec.uri, cid: rec.cid },
            });
        } catch {
            // 読めないリンクは飛ばす
        }
    }
    if (candidates.length > 0) return candidates;

    const website = normalizeWebUrl(profile.website);
    return website ? [{ url: website }] : [];
}
