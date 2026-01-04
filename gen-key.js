import * as jose from "jose";

async function run() {
    const { privateKey } = await jose.generateKeyPair("ES256", {
        extractable: true,
    });
    const jwk = await jose.exportJWK(privateKey);
    const json = JSON.stringify(jwk);
    console.log("--- RAW JSON ---");
    console.log(json);
    console.log("\n--- BASE64 (Recommended for fly secrets set) ---");
    console.log(Buffer.from(json).toString("base64"));
}
run().catch(console.error);
