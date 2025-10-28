/// <reference types="@workadventure/iframe-api-typings" />

export function initPlayerJoinAlert() {
    console.log("🔔 Player join alert initialized.");

    WA.players.onPlayerEnters.subscribe((player) => {
        console.log(`👋 Player joined: ${player.name}`);

        // Send a chat message visible to everyone
        WA.chat.sendChatMessage(`👋 ${player.name} has joined the map!`, "System");

        // Temporary visual alert (use chat + console instead of popup)
        WA.ui.openPopup("joinAlert", `⚡ ${player.name} entered the map`, [
            {
                label: "OK",
                callback: (popup) => popup.close(),
            },
        ]);
    });
}
