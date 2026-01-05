export type i18nVariables = {
    lang: "en" | "ja";
    t: (key: string, params?: Record<string, any>) => string;
};

export type AppVariables = i18nVariables & {
    jwtPayload?: any;
};

// Use our wrapper for node:sqlite
export type Bindings = {
    DB: D1Database;
};
