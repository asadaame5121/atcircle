import db from "../db.js";
import fs from "node:fs";
import path from "node:path";

const schemaPath = path.join(process.cwd(), "schema.sql");
const schema = fs.readFileSync(schemaPath, "utf8");

console.log("Initializing database from schema.sql...");

try {
    const rawDb = db.getRawDb();
    rawDb.exec(schema);
    console.log("Database initialized successfully.");
} catch (e) {
    console.error("Failed to initialize database:", e);
    process.exit(1);
}
