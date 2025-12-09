
import { WorkAdventureApi } from "@workadventure/iframe-api-typings";

const ERP_URL = "https://erp.emlenotes.com/app/home";

export function initErpZone(WA: WorkAdventureApi) {
    // عند دخول المنطقة "ERP"
    WA.room.area.onEnter('ERP').subscribe(() => {
        WA.nav.openCoWebSite(ERP_URL);
    });

    // عند الخروج من المنطقة
    WA.room.area.onLeave('ERP').subscribe(() => {
        WA.nav.closeCoWebSite();
    });
}
