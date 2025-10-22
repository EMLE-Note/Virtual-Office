/// <reference types="@workadventure/iframe-api-typings" />
import { bootstrapExtra } from "@workadventure/scripting-api-extra";

/**
 * Area alert feature that shows a flashing layer when someone enters an area.
 * The layer will appear when someone enters and disappears 30 seconds after everyone leaves.
 */

export type AreaAlertConfig = {
  areaName: string;         // Name of the area in Tiled
  indicatorLayer: string;   // Layer to show/hide based on area entry
};

// Configuration for area alerts
const areaAlerts: AreaAlertConfig[] = [
  { areaName: "ndicator", indicatorLayer: "furniture/enterndic" },
];

function initAreaAlert(config: AreaAlertConfig) {
  const TAG = `[areaAlert:${config.areaName}]`;
  let timeoutId: NodeJS.Timeout | null = null;

  // Ensure the indicator layer is initially hidden
  WA.room.hideLayer(config.indicatorLayer);
  console.log(`${TAG} Indicator layer initially hidden`);

  // When player enters the area
  WA.room.area.onEnter(config.areaName).subscribe(() => {
    console.log(`${TAG} Player entered area`);
    
    // Show the indicator layer immediately when someone enters
    WA.room.showLayer(config.indicatorLayer);
    console.log(`${TAG} Showing indicator layer`);

    // If there was a previous timeout, clear it
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    // Set a timeout to hide the layer after 30 seconds, regardless of player presence
    timeoutId = setTimeout(() => {
      WA.room.hideLayer(config.indicatorLayer);
      console.log(`${TAG} Hiding indicator layer after 30 seconds`);
      timeoutId = null;
    }, 30000); // 30 seconds
  });

  // When player leaves the area - we don't do anything here because 
  // the layer will automatically disappear after 30 seconds from the last entry
  WA.room.area.onLeave(config.areaName).subscribe(() => {
    console.log(`${TAG} Player left area`);
    // The layer remains visible for the remaining time of the 30-second countdown
  });
}

export async function initAllAreaAlerts() {
  console.log("[areaAlert] Initializing all area alerts");
  await bootstrapExtra();
  
  for (const area of areaAlerts) {
    initAreaAlert(area);
  }
  
  console.log("[areaAlert] All area alerts initialized");
}