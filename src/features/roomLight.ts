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
      WA.room.hideLayer(config.layer);
    } else {
      WA.room.showLayer(config.layer);
    }
  }

  let current = (WA.state.loadVariable(COUNTER_KEY) as number) ?? 0;
  setLights(current > 0);

  if (current === null || current === undefined) {
    WA.state.saveVariable(COUNTER_KEY, 0);
    current = 0;
  }

  WA.state.onVariableChange(COUNTER_KEY).subscribe((val: unknown) => {
    const n = typeof val === "number" ? val : 0;
    setLights(n > 0);
  });

  WA.room.area.onEnter(config.area).subscribe(() => {
    const n = (WA.state.loadVariable(COUNTER_KEY) as number) ?? 0;
    WA.state.saveVariable(COUNTER_KEY, n + 1);
  });

  WA.room.area.onLeave(config.area).subscribe(() => {
    const n = (WA.state.loadVariable(COUNTER_KEY) as number) ?? 0;
    WA.state.saveVariable(COUNTER_KEY, Math.max(0, n - 1));
  });
}

/**
 * الدالة اللي لازم تعملها import في main.ts
 */
export async function initAllRoomLights(rooms: RoomConfig[]) {
  await bootstrapExtra();
  for (const room of rooms) {
    initRoomLight(room);
  }
}
