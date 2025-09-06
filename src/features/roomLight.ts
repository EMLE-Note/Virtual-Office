/// <reference types="@workadventure/iframe-api-typings" />
import { bootstrapExtra } from "@workadventure/scripting-api-extra";

// غيّر الأسماء لو طبقة/المنطقة عندك مختلفة
const AREA = "jitsiMeetingRoom";
const DARK_LAYER = "lights/jitsiMeetingRoom-dark";

// نسخة "محليّة" (النور ينور عندك انت بس):
function applyLocal(on: boolean) {
  if (on) {
    WA.room.hideLayer(DARK_LAYER);
  } else {
    WA.room.showLayer(DARK_LAYER);
  }
}

// (اختياري) نسخة "متزامنة للجميع": نور = فيه حد جوه
const COUNTER_KEY = `occ:${AREA}`;
function bindSynced() {
  // طبّق الحالة الحالية
  const c = (WA.state.loadVariable(COUNTER_KEY) as number) || 0;
  applyLocal(c > 0);

  // اسمع أي تغيير في العدّاد
  WA.state.onVariableChange(COUNTER_KEY).subscribe((val: unknown) => {
    const n = typeof val === "number" ? val : 0;
    applyLocal(n > 0);
  });

  // زوّد/قلّل العدّاد عند الدخول/الخروج
  WA.room.area.onEnter(AREA).subscribe(() => {
    const n = (WA.state.loadVariable(COUNTER_KEY) as number) || 0;
    WA.state.saveVariable(COUNTER_KEY, n + 1);
  });
  WA.room.area.onLeave(AREA).subscribe(() => {
    const n = (WA.state.loadVariable(COUNTER_KEY) as number) || 0;
    WA.state.saveVariable(COUNTER_KEY, Math.max(0, n - 1));
  });
}

WA.onInit().then(async () => {
  // لو عايز تأثير محلي فقط (لك انت):
  // WA.room.area.onEnter(AREA).subscribe(() => applyLocal(true));
  // WA.room.area.onLeave(AREA).subscribe(() => applyLocal(false));

  // لو عايز التأثير يبقى متزامن لكل اللاعبين (أنصح بيه):
  bindSynced();

  await bootstrapExtra().catch(console.error);
});
export {};
