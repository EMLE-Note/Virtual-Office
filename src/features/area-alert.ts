/// <reference types="@workadventure/iframe-api-typings" />

import { bootstrapExtra } from "@workadventure/scripting-api-extra";

/**
 * Initialize area indicator that shows a layer for 3 seconds when player enters
 */
export async function initAllAreaAlerts() {
    await bootstrapExtra();
    
    const areaName = "indicator";
    const indicatorLayer = "furniture/enterIndicator";
    const displayDuration = 3000; // 3 seconds in milliseconds
    
    // Hide the layer initially
    WA.room.hideLayer(indicatorLayer);
    
    // Listen for player entering the area
    WA.room.area.onEnter(areaName).subscribe(() => {
        console.log(`Player entered area: ${areaName}`);
        
        // Show the indicator layer
        WA.room.showLayer(indicatorLayer);
        
        // Hide the layer after 3 seconds
        setTimeout(() => {
            WA.room.hideLayer(indicatorLayer);
            console.log(`Layer hidden after ${displayDuration}ms`);
        }, displayDuration);
    });
    
    console.log(`Area indicator initialized for area: ${areaName}`);
}