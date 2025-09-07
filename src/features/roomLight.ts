/// <reference types="@workadventure/iframe-api-typings" />
import { bootstrapExtra } from "@workadventure/scripting-api-extra";

export type RoomConfig = {
  area: string;
  layer: string;
};

function initRoomLight(config: RoomConfig) {
  const COUNTER_KEY = `occ:${config.area}`;

  function setLights(on: boolean) {
    if (on) {
      WA.room.hideLayer(config.layer); // الغرفة مضيئة (نخفي الظلام)
    } else {
      WA.room.showLayer(config.layer); // الغرفة مظلمة
    }
  }

  // استمع للتغييرات المشتركة من السيرفر
  WA.state.onVariableChange(COUNTER_KEY).subscribe((val: unknown) => {
    const n = typeof val === "number" ? val : 0;
    setLights(n > 0);
  });

  // لو أول مرة، ثبّت العداد على 0
  let current = (WA.state.loadVariable(COUNTER_KEY) as number) ?? null;
  if (current === null) {
    WA.state.saveVariable(COUNTER_KEY, 0);
    current = 0;
  }

  // ضبط الإضاءة عند البداية
  setLights(current > 0);

  // عند الدخول: زوّد العداد
  WA.room.area.onEnter(config.area).subscribe(() => {
    const n = (WA.state.loadVariable(COUNTER_KEY) as number) ?? 0;
    WA.state.saveVariable(COUNTER_KEY, n + 1);
  });

  // عند الخروج: قلّل العداد
  WA.room.area.onLeave(config.area).subscribe(() => {
    const n = (WA.state.loadVariable(COUNTER_KEY) as number) ?? 0;
    WA.state.saveVariable(COUNTER_KEY, Math.max(0, n - 1));
  });
}

export async function initAllRoomLights(rooms: RoomConfig[]) {
  await bootstrapExtra();
  for (const room of rooms) {
    initRoomLight(room);
  }
}
