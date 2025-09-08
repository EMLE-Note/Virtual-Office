/// <reference types="@workadventure/iframe-api-typings" />

import { bootstrapExtra } from "@workadventure/scripting-api-extra";

        /// <reference types="@workadventure/iframe-api-typings" />
        import { initAllRoomLights } from "./features/roomLight";

        WA.onInit().then(async () => {
        // هنا بتحط كل الغرف في Array
        const rooms = [
            { area: "jitsiMeetingRoom", layer: "lights/jitsiMeetingRoom-dark" },
            { area: "jitsiMeetingRoom-2", layer: "lights/dark1" },
            { area: "jitsiMeetingRoom-3", layer: "lights/dark2" },
            { area: "jitsiMeetingRoom-4", layer: "lights/dark3" },
            { area: "jitsiMeetingRoom-5", layer: "lights/dark4" },
            // تقدر تضيف أي عدد غرف هنا
        ];

        await initAllRoomLights(rooms);
        });

//import './features/roomLight';

import './features/heartbeat';
import { initMapPlayerCounter } from "./features/mapCounter";

WA.onInit().then(() => {
  initMapPlayerCounter("txt:mapCount");
});


console.log('Script started successfully');

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
