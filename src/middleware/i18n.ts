import type { MiddlewareHandler } from "hono";
import en from "../locales/en.json" with { type: "json" };
import ja from "../locales/ja.json" with { type: "json" };
import type { i18nVariables } from "../types/bindings.js";

const locales: Record<string, any> = { ja, en };

export const i18nMiddleware = (): MiddlewareHandler<{
    Variables: i18nVariables;
}> => {
    return async (c, next) => {
        // 1. Determine Language
        // Priority: Query param (?lang=) > Accept-Language header > Default (en)
        let lang = c.req.query("lang") as "en" | "ja";

        if (!lang || !locales[lang]) {
            const acceptLang = c.req.header("accept-language");
            if (acceptLang?.startsWith("ja")) {
                lang = "ja";
            } else {
                lang = "en";
            }
        }

        // 2. Define translation function
        const t = (path: string, params?: Record<string, any>): string => {
            const keys = path.split(".");
            let value = locales[lang];

            for (const key of keys) {
                value = value?.[key];
                if (value === undefined) break;
            }

            // Fallback to English if not found in current lang
            if (value === undefined && lang !== "en") {
                let enValue = locales.en;
                for (const key of keys) {
                    enValue = enValue?.[key];
                    if (enValue === undefined) break;
                }
                value = enValue;
            }

            if (typeof value !== "string") return path;

            // Simple parameter replacement {{param}}
            if (params) {
                Object.entries(params).forEach(([k, v]) => {
                    value = (value as string).replace(
                        new RegExp(`{{${k}}}`, "g"),
                        String(v),
                    );
                });
            }

            return value as string;
        };

        c.set("lang", lang);
        c.set("t", t);

        await next();
    };
};
