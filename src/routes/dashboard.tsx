import { Hono } from "hono";
import { DashboardView } from "../components/dashboard/DashboardView.js";
import { RegistrationForm } from "../components/dashboard/RegistrationForm.js";
import { Layout } from "../components/Layout.js";
import { authMiddleware } from "../middleware/auth.js";
import {
    DashboardService,
    type DashboardViewData,
    type RegistrationData,
} from "../services/dashboard.service.js";
import type { AppVariables, Bindings } from "../types/bindings.js";

// Sub-apps
import adminApp from "./dashboard/admin.js";
import memberApp from "./dashboard/members.js";
import moderationApp from "./dashboard/moderation.js";
import ringApp from "./dashboard/rings.js";
import siteApp from "./dashboard/site.js";
import syncApp from "./dashboard/sync.js";
import userApp from "./dashboard/user.js";
import widgetBuilder from "./widget_builder.js";

const app = new Hono<{ Bindings: Bindings; Variables: AppVariables }>();

// Protected Route Middleware
// Protected Route Middleware
app.use("*", authMiddleware);

// Mounting Sub-apps
app.route("/ring/widget", widgetBuilder);
app.route("/ring/members", memberApp);
app.route("/ring", ringApp);
app.route("/ring", moderationApp);
app.route("/site", siteApp);
app.route("/sync", syncApp);
app.route("/admin", adminApp);
app.route("/", userApp);

app.get("/", async (c) => {
    const payload = c.get("jwtPayload");
    const did = payload.sub;
    const isDebug = !!payload.isDebug;
    const isAdmin = payload.role === "admin";
    const t = c.get("t");
    const lang = c.get("lang");

    const dashboardService = new DashboardService(c.env.DB as any);
    const data = await dashboardService.getDashboardData(did);

    if (data.type === "registration") {
        const regData = data as RegistrationData;
        return c.html(
            Layout({
                title: t("dashboard.register_title"),
                t,
                lang,
                isDebug,
                children: RegistrationForm({
                    discoveryStatus: regData.discoveryStatus,
                    detectedSites: regData.detectedSites,
                    defaultSite: regData.defaultSite,
                    t,
                }),
            }),
        );
    }

    const dashData = data as DashboardViewData;
    return c.html(
        Layout({
            title: t("dashboard.title"),
            t,
            lang,
            isDebug,
            children: DashboardView({
                site: dashData.site,
                unifiedRings: dashData.unifiedRings,
                joinRequests: dashData.joinRequests,
                pendingMemberships: dashData.pendingMemberships,
                blocks: dashData.blocks,
                did: dashData.did,
                isAdmin,
                t,
            }),
        }),
    );
});

export default app;
