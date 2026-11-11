import { Hono } from "hono";
import { getCookie } from "hono/cookie";
import { HomeView } from "../components/HomeView.js";
import { Layout } from "../components/Layout.js";
import { logger as pinoLogger } from "../lib/logger.js";
import { SESSION_COOKIE } from "../lib/session.js";
import { RingRepository } from "../repositories/ring.repository.js";
import type { AppVariables, Bindings } from "../types/bindings.js";

const app = new Hono<{ Bindings: Bindings; Variables: AppVariables }>();

app.get("/", async (c) => {
    const token = getCookie(c, SESSION_COOKIE);
    if (token) {
        return c.redirect("/dashboard");
    }
    const t = c.get("t");
    const lang = c.get("lang");

    // 公開リングのプレビュー（人数の多い順に6件）。失敗してもトップは出す
    let previewRings: any[] = [];
    try {
        const ringRepo = new RingRepository(c.env.DB);
        const all = await ringRepo.getAllWithMemberCount({ onlyOpen: true });
        previewRings = all
            .sort((a, b) => (b.member_count ?? 0) - (a.member_count ?? 0))
            .slice(0, 6);
    } catch (e) {
        pinoLogger.error({ msg: "Home preview load failed", error: e });
    }

    return c.html(
        Layout({
            title: `${t("common.brand")} - ${t("common.home")}`,
            t,
            lang,
            guest: true,
            children: HomeView({ previewRings, t }),
        }),
    );
});

export default app;
