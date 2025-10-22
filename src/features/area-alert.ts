/// <reference types="@workadventure/iframe-api-typings" />
import { bootstrapExtra } from "@workadventure/scripting-api-extra";

/**
 * Area alert feature:
 * Shows a specific indicator layer for 30 seconds whenever someone enters a defined area.
 * The process repeats each time the area is entered.
 */

export type AreaAlertConfig = {
  areaName: string;         // Area name in Tiled
  indicatorLayer: string;   // Layer to show/hide when entering the area
};

// ✅ استخدم نفس الأسماء التي عندك في الخريطة بدون أي تغيير
const areaAlerts: AreaAlertConfig[] = [
   { areaName: "indicator", indicatorLayer: "furniture/enterIndicator" },
];

function initAreaAlert(config: AreaAlertConfig) {
  const TAG = `[areaAlert:${config.areaName}]`;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  console.log(`${TAG} Initializing area alert for ${config.areaName}`);

  // حاول إخفاء الطبقة مبدئيًا عند بداية التشغيل
  try {
    WA.room.hideLayer(config.indicatorLayer);
    console.log(`${TAG} Indicator layer initially hidden`);
  } catch (error) {
    console.warn(`${TAG} Could not hide layer initially (might not exist yet):`, error);
  }

  // عند دخول اللاعب للمنطقة
  WA.room.area.onEnter(config.areaName).subscribe(() => {
    console.log(`${TAG} Player entered area`);

    try {
      // إظهار الطبقة
      WA.room.showLayer(config.indicatorLayer);
      console.log(`${TAG} Showing indicator layer`);

      // لو كان فيه تايمر قديم، نحذفه
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
        console.log(`${TAG} Cleared previous timeout`);
      }

      // نبدأ عدّ 30 ثانية لإخفاء الطبقة
      timeoutId = setTimeout(() => {
        try {
          WA.room.hideLayer(config.indicatorLayer);
          console.log(`${TAG} Hiding indicator layer after 30 seconds`);
        } catch (error) {
          console.error(`${TAG} Error hiding layer:`, error);
        }
        timeoutId = null;
      }, 30000);

      console.log(`${TAG} Timeout set for 30 seconds`);
    } catch (error) {
      console.error(`${TAG} Error in onEnter handler:`, error);
    }
  });

  // عند خروج اللاعب من المنطقة (فقط نطبع للتتبع)
  WA.room.area.onLeave(config.areaName).subscribe(() => {
    console.log(`${TAG} Player left area (layer will hide after timeout)`);
  });
}

export async function initAllAreaAlerts() {
  console.log("[areaAlert] Initializing all area alerts");

  try {
    await bootstrapExtra();
    console.log("[areaAlert] bootstrapExtra completed");
  } catch (error) {
    console.error("[areaAlert] Error in bootstrapExtra:", error);
    // يمكن الاستمرار حتى لو فشل bootstrapExtra
  }

  // ننتظر WorkAdventure يجهز
  await WA.onInit();
  console.log("[areaAlert] WA.onInit completed");

  // تهيئة كل المناطق
  for (const area of areaAlerts) {
    try {
      initAreaAlert(area);
      console.log(`[areaAlert] Initialized alert for: ${area.areaName}`);
    } catch (error) {
      console.error(`[areaAlert] Error initializing alert for ${area.areaName}:`, error);
    }
  }

  console.log("[areaAlert] All area alerts initialized");
}

// تشغيل تلقائي إذا تم تحميل السكربت بشكل مباشر
if (typeof window !== "undefined") {
  initAllAreaAlerts().catch(error => {
    console.error("[areaAlert] Fatal error during initialization:", error);
  });
}
