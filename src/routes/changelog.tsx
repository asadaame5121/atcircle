import { Hono } from "hono";
import { ChangelogView } from "../components/ChangelogView.js";
import { Layout } from "../components/Layout.js";
import type { AppVariables, Bindings } from "../types/bindings.js";

const app = new Hono<{ Bindings: Bindings; Variables: AppVariables }>();

const handleChangelog = (c: any) => {
    const t = c.get("t");
    const lang = c.get("lang");

    return c.html(
        Layout({
            title: `${t("changelog.title")} | ${t("common.brand")}`,
            t,
            lang,
            children: ChangelogView({ lang, t }),
        }),
    );
};

app.get("/", handleChangelog);
app.get("/changelog", handleChangelog);

export default app;
