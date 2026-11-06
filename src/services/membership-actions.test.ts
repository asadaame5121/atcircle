import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMockDB } from "../../tests/route-utils.js";
import { MembershipActions } from "./membership-actions";
import { ringIndex } from "./ring-index";

const OWNER = "did:plc:owner";
const RING = `at://${OWNER}/net.asadaame5121.at-circle.ring/3abc`;
const REQ_A = "at://did:plc:a/net.asadaame5121.at-circle.request/1";
const REQ_B = "at://did:plc:b/net.asadaame5121.at-circle.request/1";
const MEM_C = "at://did:plc:c/net.asadaame5121.at-circle.member/1";

const view = (statuses: Record<string, string>) => ({
    ring: { uri: RING, cid: "c", value: { title: "R" } },
    memberships: Object.entries(statuses).map(([subjectUri, status]) => ({
        subjectUri,
        status,
    })),
});

describe("MembershipActions.backfillDecisions", () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        vi.spyOn(MembershipActions, "decide").mockResolvedValue(undefined);
    });

    it("DB にだけある承認・停止を decision として PDS に書く", async () => {
        // PDS では A, B とも保留、C は承認済み
        vi.spyOn(ringIndex, "getMemberships").mockResolvedValue(
            view({
                [REQ_A]: "pending",
                [REQ_B]: "pending",
                [MEM_C]: "approved",
            }) as any,
        );
        const db = createMockDB({
            all: [
                { member_uri: REQ_A, status: "approved" },
                { member_uri: REQ_B, status: "suspended" },
                { member_uri: MEM_C, status: "approved" }, // 一致しているので書かない
                { member_uri: "local-123", status: "approved" }, // AT URI でない
            ],
        });

        const written = await MembershipActions.backfillDecisions(
            db,
            {} as any,
            [RING],
        );

        expect(written).toBe(2);
        expect(MembershipActions.decide).toHaveBeenCalledWith(
            expect.anything(),
            RING,
            REQ_A,
            "approved",
        );
        expect(MembershipActions.decide).toHaveBeenCalledWith(
            expect.anything(),
            RING,
            REQ_B,
            "suspended",
        );
        expect(MembershipActions.decide).toHaveBeenCalledTimes(2);
    });

    it("PDS の一覧が取れないリングは飛ばす (誤って上書きしない)", async () => {
        vi.spyOn(ringIndex, "getMemberships").mockRejectedValue(
            new Error("down"),
        );
        const db = createMockDB({
            all: [{ member_uri: REQ_A, status: "approved" }],
        });
        expect(
            await MembershipActions.backfillDecisions(db, {} as any, [RING]),
        ).toBe(0);
        expect(MembershipActions.decide).not.toHaveBeenCalled();
    });
});
