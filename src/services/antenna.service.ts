import type {
    AntennaItem,
    AntennaRepository,
} from "../repositories/antenna.repository.js";
import type { RingRepository } from "../repositories/ring.repository.js";

export interface AntennaData {
    items: AntennaItem[];
    ringInfo: { title: string } | null;
}

export class AntennaService {
    constructor(
        private antennaRepo: AntennaRepository,
        private ringRepo: RingRepository,
    ) {}

    async getAntennaData(ringUri?: string): Promise<AntennaData> {
        let items: AntennaItem[];
        let ringInfo: { title: string } | null = null;

        if (ringUri) {
            const ring = await this.ringRepo.findByUri(ringUri);
            if (ring) {
                ringInfo = { title: ring.title };
            }
            items = await this.antennaRepo.findItemsByRing(ringUri);
        } else {
            items = await this.antennaRepo.findAllItems();
        }

        return {
            items,
            ringInfo,
        };
    }
}
