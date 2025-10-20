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
  const PLAYERS_KEY = `players:${config.deskArea}`;
  
  // Track local state
  let isPlayerInArea = false;
  let myPlayerId: string | null = null;

  function setLight(isOccupied: boolean) {
    try {
      if (isOccupied) {
        WA.room.hideLayer(config.lightOnLayer);
        console.log(`${TAG} Desk occupied - Hiding ${config.lightOnLayer}`);
      } else {
        WA.room.showLayer(config.lightOnLayer);
        console.log(`${TAG} Desk unoccupied - Showing ${config.lightOnLayer}`);
      }
    } catch (error) {
      console.error(`${TAG} Error setting light:`, error);
    }
  }

  // Get list of players in area from global state
  function getPlayersInArea(): string[] {
    const val = WA.state.loadVariable(PLAYERS_KEY);
    if (typeof val === "string") {
      try {
        return JSON.parse(val);
      } catch {
        return [];
      }
    }
    return [];
  }

  // Save list of players in area to global state
  function savePlayersInArea(players: string[]) {
    const unique = [...new Set(players)]; // Remove duplicates
    WA.state.saveVariable(PLAYERS_KEY, JSON.stringify(unique));
    return unique;
  }

  // Add player to area
  function addPlayerToArea(playerId: string) {
    const players = getPlayersInArea();
    if (!players.includes(playerId)) {
      players.push(playerId);
      const updated = savePlayersInArea(players);
      console.log(`${TAG} Added player ${playerId}. Total: ${updated.length}`);
      return updated.length;
    }
    return players.length;
  }

  // Remove player from area
  function removePlayerFromArea(playerId: string) {
    const players = getPlayersInArea();
    const filtered = players.filter(id => id !== playerId);
    const updated = savePlayersInArea(filtered);
    console.log(`${TAG} Removed player ${playerId}. Total: ${updated.length}`);
    return updated.length;
  }

  // Verify and sync counter with actual players
  async function verifyAndSyncCounter() {
    try {
      const playersInArea = getPlayersInArea();
      const activePlayers: string[] = [];

      // Get list of all active players in the room
      const allPlayers = await WA.players.list();
      const activePlayerIds = Array.from(allPlayers).map((p: any) => p.id);

      // Check which tracked players are still active
      for (const playerId of playersInArea) {
        if (activePlayerIds.includes(playerId)) {
          activePlayers.push(playerId);
        } else {
          console.log(`${TAG} Cleanup: Removing disconnected player ${playerId}`);
        }
      }

      // Update the state if there's a mismatch
      if (activePlayers.length !== playersInArea.length) {
        savePlayersInArea(activePlayers);
        setLight(activePlayers.length > 0);
        console.log(`${TAG} Synced counter: ${playersInArea.length} -> ${activePlayers.length}`);
      }
    } catch (error) {
      console.error(`${TAG} Error during verification:`, error);
    }
  }

  // Initialize
  const initialPlayers = getPlayersInArea();
  setLight(initialPlayers.length > 0);
  console.log(`${TAG} Initialized with ${initialPlayers.length} players`);

  // Get current player ID
  WA.player.state.onVariableChange("_uuid").subscribe((uuid: unknown) => {
    if (typeof uuid === "string") {
      myPlayerId = uuid;
    }
  });

  // Try to get player ID immediately
  const immediateId = WA.player.state.loadVariable("_uuid");
  if (typeof immediateId === "string") {
    myPlayerId = immediateId;
  } else {
    // Fallback: use player.id if available
    myPlayerId = (WA.player as any).id || `player-${Date.now()}`;
  }

  // Subscribe to state changes
  WA.state.onVariableChange(PLAYERS_KEY).subscribe((val: unknown) => {
    if (typeof val === "string") {
      try {
        const players = JSON.parse(val);
        const count = Array.isArray(players) ? players.length : 0;
        console.log(`${TAG} Players list changed. Count: ${count}`);
        setLight(count > 0);
      } catch (error) {
        console.error(`${TAG} Error parsing players list:`, error);
      }
    }
  });

  // When player enters the desk area
  WA.room.area.onEnter(config.deskArea).subscribe(() => {
    if (isPlayerInArea || !myPlayerId) {
      console.warn(`${TAG} Skipping enter: already in area or no player ID`);
      return;
    }
    
    isPlayerInArea = true;
    console.log(`${TAG} Player ${myPlayerId} entered desk area`);
    
    setTimeout(() => {
      addPlayerToArea(myPlayerId!);
    }, 100);
  });

  // When player leaves the desk area
  WA.room.area.onLeave(config.deskArea).subscribe(() => {
    if (!isPlayerInArea || !myPlayerId) {
      console.warn(`${TAG} Skipping leave: not in area or no player ID`);
      return;
    }
    
    isPlayerInArea = false;
    console.log(`${TAG} Player ${myPlayerId} left desk area`);
    
    setTimeout(() => {
      removePlayerFromArea(myPlayerId!);
    }, 100);
  });

  // Cleanup on page unload (handle refresh/close)
  window.addEventListener("beforeunload", () => {
    if (isPlayerInArea && myPlayerId) {
      console.log(`${TAG} Page unloading, cleaning up player ${myPlayerId}`);
      removePlayerFromArea(myPlayerId);
    }
  });

  // Periodic cleanup every 30 seconds
  setInterval(() => {
    verifyAndSyncCounter();
  }, 30000);

  // Initial cleanup after 5 seconds
  setTimeout(() => {
    verifyAndSyncCounter();
  }, 5000);
}

export async function initAllDeskLights() {
  console.log("[deskLight] Initializing all desk lights");
  
  try {
    await bootstrapExtra();
    
    // Initialize all desks
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