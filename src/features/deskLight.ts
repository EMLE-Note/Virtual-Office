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
  
  // Track local state to prevent unnecessary updates
  let isPlayerInArea = false;

  function setLight(isOccupied: boolean) {
    try {
      if (isOccupied) {
        // When desk is occupied (at least one player present), hide the light-on layer
        WA.room.hideLayer(config.lightOnLayer);
        console.log(`${TAG} Desk occupied - Hiding ${config.lightOnLayer}`);
      } else {
        // When desk is unoccupied (no players present), show the light-on layer
        WA.room.showLayer(config.lightOnLayer);
        console.log(`${TAG} Desk unoccupied - Showing ${config.lightOnLayer}`);
      }
    } catch (error) {
      console.error(`${TAG} Error setting light:`, error);
    }
  }

  // Helper function to safely get counter value
  function getCounter(): number {
    const val = WA.state.loadVariable(COUNTER_KEY);
    const count = typeof val === "number" ? val : 0;
    return Math.max(0, count); // Ensure non-negative
  }

  // Helper function to safely set counter value
  function setCounter(value: number) {
    const safeValue = Math.max(0, value);
    WA.state.saveVariable(COUNTER_KEY, safeValue);
    console.log(`${TAG} Counter set to: ${safeValue}`);
    return safeValue;
  }

  // Initialize counter if it doesn't exist
  const initialCount = getCounter();
  if (WA.state.loadVariable(COUNTER_KEY) === null || 
      WA.state.loadVariable(COUNTER_KEY) === undefined) {
    setCounter(0);
  }
  
  // Set initial light state
  setLight(initialCount > 0);

  // Subscribe to state changes from other players
  WA.state.onVariableChange(COUNTER_KEY).subscribe((val: unknown) => {
    const n = typeof val === "number" ? val : 0;
    const safeCount = Math.max(0, n);
    
    console.log(`${TAG} State changed -> Count: ${safeCount}`);
    setLight(safeCount > 0);
  });

  // When player enters the desk area
  WA.room.area.onEnter(config.deskArea).subscribe(() => {
    if (isPlayerInArea) {
      console.warn(`${TAG} Player already marked as in area, skipping enter event`);
      return;
    }
    
    isPlayerInArea = true;
    console.log(`${TAG} Player entered desk area`);
    
    // Add delay to ensure state is synchronized
    setTimeout(() => {
      const currentCount = getCounter();
      const newCount = setCounter(currentCount + 1);
      console.log(`${TAG} Incremented counter: ${currentCount} -> ${newCount}`);
    }, 100);
  });

  // When player leaves the desk area
  WA.room.area.onLeave(config.deskArea).subscribe(() => {
    if (!isPlayerInArea) {
      console.warn(`${TAG} Player not marked as in area, skipping leave event`);
      return;
    }
    
    isPlayerInArea = false;
    console.log(`${TAG} Player left desk area`);
    
    // Add delay to ensure state is synchronized
    setTimeout(() => {
      const currentCount = getCounter();
      const newCount = setCounter(currentCount - 1);
      console.log(`${TAG} Decremented counter: ${currentCount} -> ${newCount}`);
    }, 100);
  });

  // Cleanup on player disconnect (optional but recommended)
  WA.player.state.onVariableChange("_initialized").subscribe(() => {
    // Reset local state if player reconnects
    if (isPlayerInArea) {
      const currentCount = getCounter();
      if (currentCount > 0) {
        setCounter(currentCount - 1);
      }
      isPlayerInArea = false;
    }
  });
}

export async function initAllDeskLights() {
  console.log("[deskLight] Initializing all desk lights");
  
  try {
    await bootstrapExtra();
    
    // Initialize all desks sequentially to avoid conflicts
    for (const desk of deskLights) {
      try {
        initDeskLight(desk);
        console.log(`[deskLight] Initialized: ${desk.deskArea}`);
      } catch (error) {
        console.error(`[deskLight] Error initializing ${desk.deskArea}:`, error);
      }
    }
    
    console.log("[deskLight] All desk lights initialized successfully");
  } catch (error) {
    console.error("[deskLight] Error during initialization:", error);
  }
}