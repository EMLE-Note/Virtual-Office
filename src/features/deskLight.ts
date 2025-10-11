/// <reference types="@workadventure/iframe-api-typings" />
import { bootstrapExtra } from "@workadventure/scripting-api-extra";

export type DeskLightConfig = {
  deskArea: string;           // Name of the desk area in Tiled
  lightOffLayer: string;      // Layer name for when light is off
  lightOnLayer: string;       // Layer name for when light is on at desk
};

// Configuration for desk lighting
const deskLights: DeskLightConfig[] = [
  { deskArea: "desk1", lightOffLayer: "lights/light-off", lightOnLayer: "lights/light-desk1-on" },
  { deskArea: "desk2", lightOffLayer: "lights/light-off", lightOnLayer: "lights/light-desk2-on" },
  { deskArea: "desk3", lightOffLayer: "lights/light-off", lightOnLayer: "lights/light-desk3-on" },
  { deskArea: "desk4", lightOffLayer: "lights/light-off", lightOnLayer: "lights/light-desk4-on" },
  { deskArea: "desk5", lightOffLayer: "lights/light-off", lightOnLayer: "lights/light-desk5-on" },
  { deskArea: "desk6", lightOffLayer: "lights/light-off", lightOnLayer: "lights/light-desk6-on" },
  { deskArea: "desk7", lightOffLayer: "lights/light-off", lightOnLayer: "lights/light-desk7-on" },
  { deskArea: "desk8", lightOffLayer: "lights/light-off", lightOnLayer: "lights/light-desk8-on" },
  { deskArea: "desk9", lightOffLayer: "lights/light-off", lightOnLayer: "lights/light-desk9-on" },
  { deskArea: "desk10", lightOffLayer: "lights/light-off", lightOnLayer: "lights/light-desk10-on" },
  { deskArea: "desk11", lightOffLayer: "lights/light-off", lightOnLayer: "lights/light-desk11-on" },
  { deskArea: "desk12", lightOffLayer: "lights/light-off", lightOnLayer: "lights/light-desk12-on" },
  { deskArea: "desk13", lightOffLayer: "lights/light-off", lightOnLayer: "lights/light-desk13-on" },
  { deskArea: "desk14", lightOffLayer: "lights/light-off", lightOnLayer: "lights/light-desk14-on" },
  { deskArea: "desk15", lightOffLayer: "lights/light-off", lightOnLayer: "lights/light-desk15-on" },
];

function initDeskLight(config: DeskLightConfig) {
  const TAG = `[deskLight:${config.deskArea}]`;

  function setLight(isAtDesk: boolean) {
    if (isAtDesk) {
      // When player is at desk, show the desk light layer and hide the off layer
      WA.room.showLayer(config.lightOnLayer);
      WA.room.hideLayer(config.lightOffLayer);
      console.log(`${TAG} Player at desk - Showing ${config.lightOnLayer}, hiding ${config.lightOffLayer}`);
    } else {
      // When player is not at desk, show the off layer and hide the desk light
      WA.room.showLayer(config.lightOffLayer);
      WA.room.hideLayer(config.lightOnLayer);
      console.log(`${TAG} Player away from desk - Showing ${config.lightOffLayer}, hiding ${config.lightOnLayer}`);
    }
  }

  // When player enters the desk area
  WA.room.area.onEnter(config.deskArea).subscribe(() => {
    console.log(`${TAG} Player entered desk area`);
    setLight(true);
  });

  // When player leaves the desk area
  WA.room.area.onLeave(config.deskArea).subscribe(() => {
    console.log(`${TAG} Player left desk area`);
    setLight(false);
  });

  // On initialization, we can assume the player starts outside the desk area
  // so default to the off light layer
  WA.room.hideLayer(config.lightOnLayer);
  WA.room.showLayer(config.lightOffLayer);
  console.log(`${TAG} Initial state set: light off`);
}

export async function initAllDeskLights() {
  console.log("[deskLight] Initializing all desk lights");
  await bootstrapExtra();
  
  for (const desk of deskLights) {
    initDeskLight(desk);
  }
  
  console.log("[deskLight] All desk lights initialized");
}