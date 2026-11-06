import { logger as pinoLogger } from "../lib/logger.js";
import { type PublicRecords, publicRecords } from "./public-records.js";
import { isOwnedBy } from "./ring.service.js";

/**
 * did がリングを管理 (メンバーの承認・停止・キック・ブロック) できるか。
 *
 * - リングの所有者 (AT URI の DID) は常に可
 * - リングレコードの `admin` に指定された DID は可
 *
 * ローカル DB の admin_did は書き換えられる可能性があるため使わない。
 * リングレコードを読めないときは所有者以外を拒否する (安全側)。
 */
export async function canManageRing(
    did: string,
    ringUri: string,
    records: PublicRecords = publicRecords,
): Promise<boolean> {
    if (!ringUri.startsWith("at://")) return false;
    if (isOwnedBy(ringUri, did)) return true;
    try {
        const ring = await records.getRecord<{ admin?: string }>(ringUri);
        return !!ring && ring.value.admin === did;
    } catch (e) {
        pinoLogger.warn({
            msg: "[RingAccess] Could not read ring record; denying non-owner",
            ringUri,
            error: e instanceof Error ? e.message : String(e),
        });
        return false;
    }
}
