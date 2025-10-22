/// <reference types="@workadventure/iframe-api-typings" />

import { bootstrapExtra } from "@workadventure/scripting-api-extra";

import { initAllDeskLights } from "./features/deskLight";
import { setupAllWelcomeAreas } from "./features/area-messages";
import { initAllAreaAlerts } from "./features/area-alert";

WA.onInit().then(async () => {
    await initAllDeskLights();
    
    // Setup welcome message areas for all desks
    setupAllWelcomeAreas();
    
    // Initialize area alerts
    await initAllAreaAlerts();
});

console.log('Script started successfully');

import { initAllJitsiIndicators } from "./features/jitsi-tracker.js";
initAllJitsiIndicators().catch(console.error);

let currentPopup: any = undefined;

// Waiting for the API to be ready
WA.onInit().then(() => {
    console.log('Scripting API ready');
    console.log('Player tags: ',WA.player.tags)

    WA.room.area.onEnter('clock').subscribe(() => {
        const today = new Date();
        const time = today.getHours() + ":" + today.getMinutes();
        currentPopup = WA.ui.openPopup("clockPopup", "It's " + time, []);
    })

    WA.room.area.onLeave('clock').subscribe(closePopup)

    // The line below bootstraps the Scripting API Extra library that adds a number of advanced properties/features to WorkAdventure
    bootstrapExtra().then(() => {
        console.log('Scripting API Extra ready');
    }).catch(e => console.error(e));

}).catch(e => console.error(e));

function closePopup(){
    if (currentPopup !== undefined) {
        currentPopup.close();
        currentPopup = undefined;
    }
}

export {};
