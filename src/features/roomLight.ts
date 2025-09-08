/// <reference types="@workadventure/iframe-api-typings" />
import { bootstrapExtra } from "@workadventure/scripting-api-extra";

export type RoomConfig = {
  area: string;
  layer: string;
};

// Array فيها كل الغرف
const rooms: RoomConfig[] = [
  { area: "jitsiMeetingRoom", layer: "lights/jitsiMeetingRoom-dark" },
  { area: "jitsiMeetingRoom-2", layer: "lights/dark1" },
  { area: "jitsiMeetingRoom-3", layer: "lights/dark2" },
  { area: "jitsiMeetingRoom-4", layer: "lights/dark3" },
  { area: "jitsiMeetingRoom-5", layer: "lights/dark4" },
];

function initRoomLight(config: RoomConfig) {
  const TAG = `[roomLight:${config.area}]`;
  const COUNTER_KEY = `occ:${config.area}`;

  function setLights(on: boolean) {
    if (on) {
      WA.room.hideLayer(config.layer);
    } else {
      WA.room.showLayer(config.layer);
    }
  }

  WA.state.onVariableChange(COUNTER_KEY).subscribe((val: unknown) => {
    const n = typeof val === "number" ? val : 0;
    console.log(`${TAG} onVariableChange ->`, n);
    setLights(n > 0);
  });

  let current = WA.state.loadVariable(COUNTER_KEY) as number | null;
  if (current === null || current === undefined) {
    WA.state.saveVariable(COUNTER_KEY, 0);
    current = 0;
  }
  setLights(current > 0);

  WA.room.area.onEnter(config.area).subscribe(() => {
    console.log(`${TAG} onEnter triggered`);
    const n = (WA.state.loadVariable(COUNTER_KEY) as number) ?? 0;
    WA.state.saveVariable(COUNTER_KEY, n + 1);
  });

  WA.room.area.onLeave(config.area).subscribe(() => {
    console.log(`${TAG} onLeave triggered`);
    const n = (WA.state.loadVariable(COUNTER_KEY) as number) ?? 0;
    WA.state.saveVariable(COUNTER_KEY, Math.max(0, n - 1));
  });
}

export async function initAllRoomLights() {
  console.log("[roomLight] initAllRoomLights called");
  await bootstrapExtra();
  for (const room of rooms) {
    initRoomLight(room);
  }
}
