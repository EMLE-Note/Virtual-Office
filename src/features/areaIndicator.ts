/// <reference types="@workadventure/iframe-api-typings" />
import { bootstrapExtra } from "@workadventure/scripting-api-extra";

export type AreaIndicatorConfig = {
  areaName: string;    // Name of the area in Tiled
  layerName: string;   // Layer to show when player enters the area
  displayDuration?: number; // Duration to keep layer visible after leaving (ms)
};

// Configuration for area indicators
const areaIndicators: AreaIndicatorConfig[] = [
  { areaName: "indicator", layerName: "enterIndicator", displayDuration: 3000 },
];

function initAreaIndicator(config: AreaIndicatorConfig) {
  const TAG = `[areaIndicator:${config.areaName}]`;

  // When player enters area → show layer immediately
  WA.room.area.onEnter(config.areaName).subscribe(() => {
    WA.room.showLayer(config.layerName);
    console.log(`${TAG} Player entered area, showing layer: ${config.layerName}`);
  });

  // When player leaves area → delay hiding the layer
  WA.room.area.onLeave(config.areaName).subscribe(() => {
    console.log(`${TAG} Player left area, will hide layer after ${config.displayDuration ?? 3000}ms`);
    setTimeout(() => {
      WA.room.hideLayer(config.layerName);
      console.log(`${TAG} Layer hidden after delay`);
    }, config.displayDuration ?? 3000);
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
