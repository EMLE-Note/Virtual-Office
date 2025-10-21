/// <reference types="@workadventure/iframe-api-typings" />
import { bootstrapExtra } from "@workadventure/scripting-api-extra";

export type DeskLightConfig = {
  deskArea: string;           // Name of the desk area in Tiled
  lightOnLayer: string;       // Layer name for the light layer that should be deactivated when someone enters
};

// Configuration for desk lighting
const deskLights: DeskLightConfig[] = [
  { deskArea: "jitsiMeetingRoom", lightOnLayer: "lights/light-desk1-on" },
  { deskArea: "desk2", lightOnLayer: "lights/light-desk2-on" },
  { deskArea: "desk3", lightOnLayer: "lights/light-desk3-on" },
  { deskArea: "desk5", lightOnLayer: "lights/light-desk5-on" },
  { deskArea: "desk6", lightOnLayer: "lights/light-desk6-on" },
  { deskArea: "desk7", lightOnLayer: "lights/light-desk7-on" },
  { deskArea: "desk8", lightOnLayer: "lights/light-desk8-on" },
  { deskArea: "desk9", lightOnLayer: "lights/light-desk9-on" },
  { deskArea: "desk10", lightOnLayer: "lights/light-desk10-on" },
  { deskArea: "desk11", lightOnLayer: "lights/light-desk11-on" },
  { deskArea: "desk12", lightOnLayer: "lights/light-desk12-on" },
  { deskArea: "desk13", lightOnLayer: "lights/light-desk13-on" },
  { deskArea: "jitsiMeetingRoom-b", lightOnLayer: "lights/meeting-b-on" },
  { deskArea: "jitsiMeetingRoom-a", lightOnLayer: "lights/meeting-a-on" },
];

function initDeskLight(config: DeskLightConfig) {
  const TAG = `[deskLight:${config.deskArea}]`;
  const COUNTER_KEY = `occ:${config.deskArea}`;

  function setLight(isOccupied: boolean) {
    if (isOccupied) {
      // When desk is occupied (at least one player present), hide the light-on layer to deactivate lighting
      WA.room.hideLayer(config.lightOnLayer);
      console.log(`${TAG} Desk occupied - Hiding ${config.lightOnLayer}`);
    } else {
      // When desk is unoccupied (no players present), show the light-on layer to activate lighting
      WA.room.showLayer(config.lightOnLayer);
      console.log(`${TAG} Desk unoccupied - Showing ${config.lightOnLayer}`);
    }
  }

  WA.state.onVariableChange(COUNTER_KEY).subscribe((val: unknown) => {
    const n = typeof val === "number" ? val : 0;
    console.log(`${TAG} onVariableChange ->`, n);
    setLight(n > 0);
  });

  let current = WA.state.loadVariable(COUNTER_KEY) as number | null;
  if (current === null || current === undefined) {
    WA.state.saveVariable(COUNTER_KEY, 0);
    current = 0;
  }
  setLight(current > 0);

  // When player enters the desk area
  WA.room.area.onEnter(config.deskArea).subscribe(() => {
    console.log(`${TAG} Player entered desk area`);
    const n = (WA.state.loadVariable(COUNTER_KEY) as number) ?? 0;
    WA.state.saveVariable(COUNTER_KEY, n + 1);
  });

  // When player leaves the desk area
  WA.room.area.onLeave(config.deskArea).subscribe(() => {
    console.log(`${TAG} Player left desk area`);
    const n = (WA.state.loadVariable(COUNTER_KEY) as number) ?? 0;
    WA.state.saveVariable(COUNTER_KEY, Math.max(0, n - 1));
  });
}

export async function initAllDeskLights() {
  console.log("[deskLight] Initializing all desk lights");
  await bootstrapExtra();
  
  for (const desk of deskLights) {
    initDeskLight(desk);
  }
  
  console.log("[deskLight] All desk lights initialized");
}