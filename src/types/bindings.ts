import { D1DatabaseCompat } from "../db.js";

// Use our compat wrapper for node:sqlite
export type Bindings = {
    DB: D1DatabaseCompat;
};
