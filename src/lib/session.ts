import { NODE_ENV } from "../config.js";

export const SESSION_COOKIE =
    NODE_ENV === "production" ? "__Host-session" : "session";
