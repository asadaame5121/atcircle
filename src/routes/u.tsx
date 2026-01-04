import { Hono } from "hono";
import { Layout } from "../components/Layout.js";
import { ProfileView } from "../components/ProfileView.js";
import { SiteRepository } from "../repositories/site.repository.js";
import { ProfileService } from "../services/profile.service.js";
import type { AppVariables, Bindings } from "../types/bindings.js";

const app = new Hono<{ Bindings: Bindings; Variables: AppVariables }>();

app.get("/:handle", async (c) => {
    const handle = c.req.param("handle");
    const t = c.get("t");
    const lang = c.get("lang");

    const siteRepo = new SiteRepository(c.env.DB as any);
    const profileService = new ProfileService(siteRepo, c.env.DB as any);

    const profileData = await profileService.getProfileData(handle);

    if (!profileData) {
        return c.notFound();
    }

    return c.html(
        Layout({
            title: `${handle} - Profile`,
            t,
            lang,
            children: ProfileView({
                ...profileData,
                t,
            }),
        }),
    );
});

export default app;
