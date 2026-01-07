import { Agent } from "@atproto/api";
import { AtProtoService } from "../services/atproto.js";
import "dotenv/config";

const _CONSTELLATION_API_URL = "https://constellation.microcosm.blue";

async function findRingsForUser(did: string) {
    console.log(`Searching rings for user: ${did}`);

    // For simplicity, we'll try to use the public entryway or resolve via Agent.
    const agent = new Agent("https://public.api.bsky.app"); // Default public AppView/PDS
    // Note: If the user is on a different PDS, we should resolve their DID doc to find the PDS.
    // Agent.resolveHandle/resolveDid can help, but we might need to connect to their specific PDS for listRecords if not federated to AppView.
    // Assuming AppView (bsky.app) has the data if it's federated.

    // 1. Resolve PDS logic (still good to have for robustness, or assume agent is capable)
    console.log("--- Resolving PDS for user ---");
    let pdsAgent = agent;
    try {
        const res = await fetch(`https://plc.directory/${did}`);
        if (res.ok) {
            const didDoc = (await res.json()) as any;
            const pdsService = didDoc.service?.find(
                (s: any) => s.type === "AtprotoPersonalDataServer",
            );
            if (pdsService) {
                console.log(`Resolved PDS: ${pdsService.serviceEndpoint}`);
                pdsAgent = new Agent(pdsService.serviceEndpoint);
            }
        }
    } catch (e) {
        console.warn("Failed to resolve DID, using default agent:", e);
    }

    console.log(`--- Searching rings for user: ${did} ---`);
    const result = await AtProtoService.findUserLinkedRings(pdsAgent, did);

    console.log("Joined Rings (from PDS):", result.joined.length);
    result.joined.forEach((uri) => {
        console.log(` - ${uri}`);
    });

    console.log("Owned Rings (from Constellation):", result.owned.length);
    result.owned.forEach((uri) => {
        console.log(` - ${uri}`);
    });

    console.log("Total Unique Linked Rings:", result.all.length);
}

const targetDid = process.argv[2];
if (!targetDid) {
    console.error("Please provide a DID as an argument.");
    process.exit(1);
}

findRingsForUser(targetDid);
