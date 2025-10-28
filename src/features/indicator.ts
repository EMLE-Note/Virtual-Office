/// <reference types="@workadventure/iframe-api-typings" />

export async function initializeIndicator(): Promise<void> {
  console.log("[indicator] Initializing indicator script");
  
  const areaName = "indicator";
  const layerName = "enterIndicator";

  // When player enters the area, show the layer
  WA.room.area.onEnter(areaName).subscribe(() => {
    console.log(`[indicator] Player entered area ${areaName}, showing layer ${layerName}`);
    WA.room.showLayer(layerName);
  });

  // When player exits the area, hide the layer
  WA.room.area.onLeave(areaName).subscribe(() => {
    console.log(`[indicator] Player left area ${areaName}, hiding layer ${layerName}`);
    WA.room.hideLayer(layerName);
  });

  console.log("[indicator] Indicator script initialized successfully");
}
