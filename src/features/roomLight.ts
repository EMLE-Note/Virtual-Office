/// <reference types="@workadventure/iframe-api-typings" />
import { bootstrapExtra } from "@workadventure/scripting-api-extra";

const AREA = "jitsiMeetingRoom";
const DARK_LAYER = "lights/jitsiMeetingRoom-dark";
const COUNTER_KEY = `occ:${AREA}`;

function setLights(on: boolean) {
  if (on) {
    WA.room.hideLayer(DARK_LAYER);
  } else {
    WA.room.showLayer(DARK_LAYER);
  }
}

async function initSyncedLights() {
  // مهم: فعّل الـ Extra قبل أي تعامل مع WA.state
  await bootstrapExtra();

  // اقرا الحالة الحالية وابدأ بيها
  let current = (WA.state.loadVariable(COUNTER_KEY) as number) ?? 0;
  setLights(current > 0);

  // لو أول مرة يتستخدم المفتاح، ثبّت 0 (مرة واحدة)
  if (current === null || current === undefined) {
    WA.state.saveVariable(COUNTER_KEY, 0);
    current = 0;
  }

  // اسمع أي تغيّر من السيرفر (يوصل لكل اللاعبين)
  WA.state.onVariableChange(COUNTER_KEY).subscribe((val: unknown) => {
    const n = typeof val === "number" ? val : 0;
    setLights(n > 0);
  });

  // زوّد/قلّل العداد عند الدخول/الخروج
  WA.room.area.onEnter(AREA).subscribe(() => {
    const n = (WA.state.loadVariable(COUNTER_KEY) as number) ?? 0;
    WA.state.saveVariable(COUNTER_KEY, n + 1);
  });

  WA.room.area.onLeave(AREA).subscribe(() => {
    const n = (WA.state.loadVariable(COUNTER_KEY) as number) ?? 0;
    WA.state.saveVariable(COUNTER_KEY, Math.max(0, n - 1));
  });
}

WA.onInit().then(() => {
  // وضع متزامن للجميع
  initSyncedLights().catch(console.error);

  // لو عايز وضع محلي فقط (شيل المتزامن فوق واستخدم السطور دي بدلًا منه):
  // WA.room.area.onEnter(AREA).subscribe(() => setLights(true));
  // WA.room.area.onLeave(AREA).subscribe(() => setLights(false));
});

export {};
