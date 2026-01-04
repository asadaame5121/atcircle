import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { AntennaView } from "../components/AntennaView.js";
import { Layout } from "../components/Layout.js";
import { logger as pinoLogger } from "../lib/logger.js";
import { AntennaRepository } from "../repositories/antenna.repository.js";
import { RingRepository } from "../repositories/ring.repository.js";
import { ringQuerySchema } from "../schemas/index.js";
import { AntennaService } from "../services/antenna.service.js";
import type { AppVariables, Bindings } from "../types/bindings.js";

const app = new Hono<{ Bindings: Bindings; Variables: AppVariables }>();

app.get("/", zValidator("query", ringQuerySchema), async (c) => {
    const { ring: ringUri } = c.req.valid("query");
    const t = c.get("t");
    const lang = c.get("lang");

    try {
        const antennaRepo = new AntennaRepository(c.env.DB);
        const ringRepo = new RingRepository(c.env.DB);
        const antennaService = new AntennaService(antennaRepo, ringRepo);

        const { items, ringInfo } =
            await antennaService.getAntennaData(ringUri);

        let title = t("antenna.title");
        if (ringInfo) {
            title = `${ringInfo.title} - ${t("antenna.title")}`;
        }

        return c.html(
            Layout({
                title: title,
                t,
                lang,
                children: AntennaView({
                    items,
                    ringInfo,
                    ringUri,
                    t,
                }),
            }),
        );
    } catch (e) {
        pinoLogger.error({ msg: "Antenna load failed", error: e });
        return c.text(
            t("error.failed_load_antenna") || "Failed to load antenna",
            500,
        );
    }
});

export default app;
