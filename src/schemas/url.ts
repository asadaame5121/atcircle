import { z } from "zod";
import { isHttpUrl } from "../lib/html.js";

/**
 * An absolute http(s) URL. `z.string().url()` alone also accepts
 * `javascript:` and `data:` URLs, which must never be stored as links.
 */
export const httpUrl = (message = "Invalid URL") =>
    z.string().url(message).refine(isHttpUrl, message);
