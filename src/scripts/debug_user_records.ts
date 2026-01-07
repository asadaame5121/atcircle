import { Agent } from "@atproto/api";
import { NetNS } from "../lexicons/index.js";

async function main() {
    const agent = new Agent("https://public.api.bsky.app");
    const did = "did:plc:xadchjnbtfe27igf5nwfz6a3"; // atasinti.bsky.social

    console.log(`Fetching membership records for ${did}...`);

    const net = new NetNS(agent);

    try {
        const response = await net.asadaame5121.atCircle.member.list({
            repo: did,
        });

        console.log(`Found ${response.records.length} records.`);

        for (const record of response.records) {
            console.log("---------------------------------------------------");
            console.log(`URI: ${record.uri}`);
            console.log("Value:", JSON.stringify(record.value, null, 2));

            const ringUri = (record.value as any).ring?.uri;
            console.log(`Ring URI check: '${ringUri}'`);
            if (
                !ringUri ||
                !ringUri.startsWith("at://") ||
                !ringUri.includes("/")
            ) {
                console.log("-> INVALID RING URI DETECTED");
            } else {
                console.log("-> VALID RING URI FORMAT");
            }
        }
    } catch (e) {
        console.error("Failed to fetch records:", e);
    }
}

main();
