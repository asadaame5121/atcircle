import { RingRepository } from "../repositories/ring.repository.js";
import type { Ring } from "../types/db.js";
import { publicRecords } from "./public-records.js";
import type { RingValue } from "./ring-index.js";

/**
 * リングの表示用データ。DB はキャッシュで、PDS のリングレコードが正本。
 *
 * - キャッシュになければ PDS から取り込む (他のクライアントで作られたリング等)
 * - PDS の内容が変わっていればキャッシュを更新する
 */
export async function findRing(
    db: D1Database,
    { uri, slug }: { uri?: string; slug?: string },
): Promise<Ring | null> {
    const repo = new RingRepository(db);
    const cached = uri
        ? await repo.findByUri(uri)
        : slug
          ? await repo.findBySlug(slug)
          : null;
    if (cached || !uri?.startsWith("at://")) return cached;

    try {
        const rec = await publicRecords.getRecord<RingValue>(uri);
        if (!rec) return null;
        await repo.upsertFromRecord(uri, rec.value);
        return await repo.findByUri(uri);
    } catch {
        return null;
    }
}

/** PDS のリングレコードと食い違っていればキャッシュを直し、表示用の行を返す */
export async function refreshRingCache(
    db: D1Database,
    row: Ring,
    value: RingValue,
): Promise<Ring> {
    const changed =
        row.title !== value.title ||
        (row.description || null) !== (value.description || null) ||
        row.status !== (value.status || "open") ||
        row.acceptance_policy !== (value.acceptancePolicy || "automatic") ||
        (row.admin_did || null) !== (value.admin || null) ||
        (!!value.slug && value.slug !== row.slug) ||
        (!!value.bannerUrl && value.bannerUrl !== row.banner_url);
    if (!changed) return row;

    const repo = new RingRepository(db);
    await repo.upsertFromRecord(row.uri, value);
    return (await repo.findByUri(row.uri)) ?? row;
}
