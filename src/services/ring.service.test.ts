import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMockDB } from "../../tests/route-utils.js";
import { AtProtoService } from "./atproto.js";
import * as oauth from "./oauth.js";
import { RingService } from "./ring.service.js";

const VICTIM_RING = "at://did:plc:victim/net.asadaame5121.at-circle.ring/3abc";
const VICTIM_MEMBER =
    "at://did:plc:victim/net.asadaame5121.at-circle.member/3mem";
const OWN_RING = "at://did:plc:me/net.asadaame5121.at-circle.ring/3own";
const OWN_MEMBER = "at://did:plc:me/net.asadaame5121.at-circle.member/3mine";

const writes = (db: D1Database) =>
    (db.prepare as any).mock.calls
        .map((c: any[]) => c[0] as string)
        .filter((q: string) => /UPDATE/i.test(q));

describe("RingService のバナー更新の権限", () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        vi.spyOn(oauth, "restoreAgent").mockResolvedValue({
            service: "https://pds.test",
        } as any);
        vi.spyOn(AtProtoService, "setRingBanner").mockResolvedValue({
            ref: { toString: () => "bafycid" },
        } as any);
    });

    describe("saveWidgetSettings", () => {
        it("他人のメンバーのバナーは変更できない", async () => {
            const db = createMockDB({ first: null });
            const result = await new RingService(db).saveWidgetSettings(
                "did:plc:me",
                VICTIM_RING,
                "https://evil.test/x.png",
                VICTIM_MEMBER,
            );
            expect(result).toEqual({ success: false, error: "Unauthorized" });
            expect(writes(db)).toHaveLength(0);
        });

        it("他人のリングのバナーは変更できない", async () => {
            const db = createMockDB({ first: null });
            const result = await new RingService(db).saveWidgetSettings(
                "did:plc:me",
                VICTIM_RING,
                "https://evil.test/x.png",
            );
            expect(result).toEqual({ success: false, error: "Unauthorized" });
            expect(writes(db)).toHaveLength(0);
        });

        it("自分のメンバーのバナーは変更できる", async () => {
            const db = createMockDB({ first: null });
            const result = await new RingService(db).saveWidgetSettings(
                "did:plc:me",
                VICTIM_RING,
                "https://ok.test/x.png",
                OWN_MEMBER,
            );
            expect(result).toEqual({ success: true });
            expect(writes(db)).toHaveLength(1);
        });

        it("自分のリングのバナーは変更できる", async () => {
            const db = createMockDB({ first: null });
            const result = await new RingService(db).saveWidgetSettings(
                "did:plc:me",
                OWN_RING,
                "https://ok.test/x.png",
            );
            expect(result).toEqual({ success: true });
            expect(writes(db)).toHaveLength(1);
        });
    });

    describe("uploadBanner", () => {
        const png = new Blob([new Uint8Array([1, 2, 3])], {
            type: "image/png",
        });

        it("他人のリングにはアップロードしない", async () => {
            const db = createMockDB({ first: null });
            const result = await new RingService(db).uploadBanner(
                "did:plc:me",
                VICTIM_RING,
                png,
            );
            expect(result).toEqual({ success: false, error: "Unauthorized" });
            expect(AtProtoService.setRingBanner).not.toHaveBeenCalled();
            expect(writes(db)).toHaveLength(0);
        });

        it("他人のメンバーにはアップロードしない", async () => {
            const db = createMockDB({ first: null });
            const result = await new RingService(db).uploadBanner(
                "did:plc:me",
                VICTIM_RING,
                png,
                VICTIM_MEMBER,
            );
            expect(result).toEqual({ success: false, error: "Unauthorized" });
            expect(AtProtoService.setRingBanner).not.toHaveBeenCalled();
            expect(writes(db)).toHaveLength(0);
        });

        it("自分のリングにはアップロードできる", async () => {
            const db = createMockDB({ first: null });
            const result = await new RingService(db).uploadBanner(
                "did:plc:me",
                OWN_RING,
                png,
            );
            expect(result.success).toBe(true);
            expect(writes(db)).toHaveLength(1);
        });
    });
});
