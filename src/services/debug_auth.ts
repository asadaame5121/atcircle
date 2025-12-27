import { validateHandle } from "./auth";

console.log("--- START DEBUG ---");
const result = validateHandle("invalid_handle!");
console.log(JSON.stringify(result, null, 2));
console.log("--- END DEBUG ---");
