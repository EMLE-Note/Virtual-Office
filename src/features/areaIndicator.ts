/// <reference types="@workadventure/iframe-api-typings" />
import { bootstrapExtra } from "@workadventure/scripting-api-extra";

export type AreaIndicatorConfig = {
  areaName: string;    // Name of the area in Tiled
  layerName: string;   // Layer to show when player enters the area
};

// Configuration for area indicators
const areaIndicators: AreaIndicatorConfig[] = [
  { areaName: "indicator", layerName: "enterIndicator" },
];

function initAreaIndicator(config: AreaIndicatorConfig) {
  const TAG = `[areaIndicator:${config.areaName}]`;

  // Show the layer when player enters the area
  WA.room.area.onEnter(config.areaName).subscribe(() => {
    WA.room.showLayer(config.layerName);
    console.log(`${TAG} Player entered area, showing layer: ${config.layerName}`);
  });

  // Optionally, hide the layer when player leaves the area
  WA.room.area.onLeave(config.areaName).subscribe(() => {
    WA.room.hideLayer(config.layerName);
    console.log(`${TAG} Player left area, hiding layer: ${config.layerName}`);
  });
}

export async function initAreaIndicators() {
  console.log("[areaIndicator] Initializing area indicators");
  await WA.onInit();      // Initialize the WorkAdventure API
  await bootstrapExtra(); // Initialize extended API features
  
  for (const indicator of areaIndicators) {
    initAreaIndicator(indicator);
  }
  
  console.log("[areaIndicator] All area indicators initialized");
}