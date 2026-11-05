import { Hono } from "hono";
import { HelpView } from "../components/HelpView.js";
import { Layout } from "../components/Layout.js";
import type { AppVariables, Bindings } from "../types/bindings.js";

const app = new Hono<{ Bindings: Bindings; Variables: AppVariables }>();

const handleHelp = (c: any) => {
    const t = c.get("t");
    const lang = c.get("lang");

    return c.html(
        Layout({
            title: `${t("help.title")} | ${t("common.brand")}`,
            t,
            lang,
            children: HelpView({ lang, t }),
        }),
    );
};

app.get("/", handleHelp);
app.get("/help", handleHelp);

export default app;
