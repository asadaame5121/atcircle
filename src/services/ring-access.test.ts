import { describe, expect, it, vi } from "vitest";
import type { PublicRecords } from "./public-records";
import { canManageRing } from "./ring-access";

const RING = "at://did:plc:owner/net.asadaame5121.at-circle.ring/3abc";

const recordsWith = (getRecord: (uri: string) => Promise<unknown>) =>
    ({ getRecord: vi.fn(getRecord) }) as unknown as PublicRecords;

describe("canManageRing", () => {
    it("リングの所有者は管理できる (レコードを読まずに判定)", async () => {
        const records = recordsWith(async () => {
            throw new Error("should not be called");
        });
        expect(await canManageRing("did:plc:owner", RING, records)).toBe(true);
        expect(records.getRecord).not.toHaveBeenCalled();
    });

    it("リングレコードの admin に指定された DID は管理できる", async () => {
        const records = recordsWith(async () => ({
            uri: RING,
            cid: "c",
            value: { admin: "did:plc:admin" },
        }));
        expect(await canManageRing("did:plc:admin", RING, records)).toBe(true);
    });

    it("それ以外の DID は管理できない (DB の admin_did は見ない)", async () => {
        const records = recordsWith(async () => ({
            uri: RING,
            cid: "c",
            value: { admin: "did:plc:admin" },
        }));
        expect(await canManageRing("did:plc:attacker", RING, records)).toBe(
            false,
        );
    });

    it("リングレコードが読めないときは所有者以外を拒否する", async () => {
        const records = recordsWith(async () => {
            throw new Error("network down");
        });
        expect(await canManageRing("did:plc:admin", RING, records)).toBe(false);
        const missing = recordsWith(async () => null);
        expect(await canManageRing("did:plc:admin", RING, missing)).toBe(false);
    });

    it("不正な URI は拒否する", async () => {
        const records = recordsWith(async () => null);
        expect(await canManageRing("did:plc:owner", "garbage", records)).toBe(
            false,
        );
    });
});
