
import { WorkAdventureApi } from "@workadventure/iframe-api-typings";

const ERP_URL = "https://erp.emlenotes.com/app/home";

export function initErpZone(WA: WorkAdventureApi) {
    let currentPopup: any = undefined;

    // عند دخول المنطقة "ERP"
    WA.room.area.onEnter('ERP').subscribe(() => {
        // نظرًا لأن الموقع لا يدعم iFrame (بسبب X-Frame-Options)،
        // الحل هو عرض نافذة منبثقة (Popup) تطلب من المستخدم فتح النظام في تبويب جديد.
        // متصفحات الإنترنت تمنع فتح تبويبات جديدة تلقائياً بدون تفاعل المستخدم (Click).

        currentPopup = WA.ui.openPopup("ERP", "نظام ERP", [
            {
                label: "فتح النظام (Open ERP)",
                className: "primary",
                callback: (popup) => {
                    // فتح في تبويب جديد
                    WA.nav.openTab(ERP_URL);
                    popup.close();
                }
            }
        ]);
    });

    // عند الخروج من المنطقة
    WA.room.area.onLeave('ERP').subscribe(() => {
        if (currentPopup) {
            currentPopup.close();
            currentPopup = undefined;
        }
    });
}
