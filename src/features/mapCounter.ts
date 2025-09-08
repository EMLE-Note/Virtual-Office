/// <reference types="@workadventure/iframe-api-typings" />
import { bootstrapExtra } from "@workadventure/scripting-api-extra";

export async function initMapPlayerCounter(textObject: string) {
  await bootstrapExtra();

  const COUNTER_KEY = "occ:map";

  function updateText(count: number) {
    WA.room.setProperty(textObject, "text", `Players on map: ${count}`);
    console.log(`[DBG] Map count = ${count}`);
  }

  // استمع لأي تغيّر
  WA.state.onVariableChange(COUNTER_KEY).subscribe((val: unknown) => {
    const n = typeof val === "number" ? val : 0;
    updateText(n);
  });

  // قيمة البداية
  let current = (WA.state.loadVariable(COUNTER_KEY) as number) ?? null;
  if (current === null) {
    WA.state.saveVariable(COUNTER_KEY, 0);
    current = 0;
  }
  updateText(current);

  // تسجيل أول دخول
  let joined = false;
  WA.player.onPlayerMove(() => {
    if (!joined) {
      const n = (WA.state.loadVariable(COUNTER_KEY) as number) ?? 0;
      WA.state.saveVariable(COUNTER_KEY, n + 1);
      joined = true;
    }
  });

  // تسجيل خروج (قبل إغلاق التبويب/الانتقال)
  window.addEventListener("beforeunload", () => {
    const n = (WA.state.loadVariable(COUNTER_KEY) as number) ?? 0;
    WA.state.saveVariable(COUNTER_KEY, Math.max(0, n - 1));
  });
}
