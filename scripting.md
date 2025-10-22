# WorkAdventure Scripting Guide

## Table of Contents
1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
3. [Core Concepts](#core-concepts)
4. [Jitsi Tracker Implementation](#jitsi-tracker-implementation)
5. [Area-Based Interactions](#area-based-interactions)
6. [Variable Management](#variable-management)
7. [Layer Management](#layer-management)
8. [Best Practices](#best-practices)
9. [Common Patterns](#common-patterns)
10. [Debugging Tips](#debugging-tips)

## Introduction

This guide provides documentation for WorkAdventure scripting, with a focus on implementing interactive features like Jitsi room indicators. WorkAdventure scripting allows you to create dynamic and interactive experiences using the WorkAdventure IFrame API.

## Getting Started

### Prerequisites
- TypeScript knowledge
- Understanding of WorkAdventure map structure (Tiled JSON format)
- Basic understanding of RxJS observables

### Setup
1. Create TypeScript files in the `src/features/` directory
2. Import and initialize your features in `src/main.ts`
3. Use `bootstrapExtra()` to access extended scripting API

### Basic Structure
```typescript
/// <reference types="@workadventure/iframe-api-typings" />
import { bootstrapExtra } from "@workadventure/scripting-api-extra";

// Feature implementation
export async function initializeFeature(): Promise<void> {
  await WA.onInit();  // Wait for API initialization
  await bootstrapExtra();  // Initialize extended API features

  // Your feature logic here
}
```

## Core Concepts

### WA State
- Used for persistent variables within a room
- Variables are shared among all players in the same room
- Use `WA.state` to store and retrieve data

### WA Room
- Controls room-level interactions
- Area detection, layer management, and room properties
- Use `WA.room` to interact with the map environment

### Observables
- Many WorkAdventure API methods return RxJS observables
- Subscribe to changes rather than polling
- Remember to unsubscribe when appropriate

## Jitsi Tracker Implementation

### Overview
The Jitsi tracker feature monitors Jitsi rooms and updates visual indicators based on occupancy. It demonstrates several key scripting concepts:

1. Monitoring room variables
2. Managing map layers
3. Handling area interactions

### Key Components

#### 1. Configuration Interface
```typescript
export type JitsiIndicatorConfig = {
  jitsiRoomName: string;    // Name of the Jitsi room in Tiled
  indicatorLayer: string;   // Layer to show/hide based on occupancy
};
```

#### 2. Occupancy Counter
- WorkAdventure automatically manages `occ:RoomName` variables when Jitsi rooms are properly configured
- These variables track the number of participants in Jitsi rooms
- The variable name format is `occ:` + the room name

#### 3. Indicator Management
- When occupancy > 0, show the indicator layer
- When occupancy = 0, hide the indicator layer
- Use `WA.room.showLayer()` and `WA.room.hideLayer()` methods

### Complete Example
```typescript
/// <reference types="@workadventure/iframe-api-typings" />
import { bootstrapExtra } from "@workadventure/scripting-api-extra";

export type JitsiIndicatorConfig = {
  jitsiRoomName: string;
  indicatorLayer: string;
};

// Configuration for Jitsi rooms
const jitsiRooms: JitsiIndicatorConfig[] = [
  { jitsiRoomName: "Operations", indicatorLayer: "furniture/Jitsi_Indicator" },
];

function initJitsiIndicator(config: JitsiIndicatorConfig) {
  const TAG = `[jitsiIndicator:${config.jitsiRoomName}]`;
  // The variable that tracks participants in a Jitsi room
  const JITSI_COUNTER_KEY = `occ:${config.jitsiRoomName}`;

  function setIndicator(isActive: boolean) {
    if (isActive) {
      // When there's an active call, show the indicator layer
      WA.room.showLayer(config.indicatorLayer);
      console.log(`${TAG} Showing indicator layer - Active Jitsi meeting`);
    } else {
      // When no call is active, hide the indicator layer
      WA.room.hideLayer(config.indicatorLayer);
      console.log(`${TAG} Hiding indicator layer - No active meeting`);
    }
  }

  // Listen for changes in Jitsi participant count
  WA.state.onVariableChange(JITSI_COUNTER_KEY).subscribe((val: unknown) => {
    const participantsCount = typeof val === "number" ? val : 0;
    console.log(`${TAG} Jitsi participants count: ${participantsCount}`);
    // Only show indicator if there are participants in the call
    setIndicator(participantsCount > 0);
  });

  // Check initial value
  let current = WA.state.loadVariable(JITSI_COUNTER_KEY) as number | null;
  if (current === null || current === undefined) {
    WA.state.saveVariable(JITSI_COUNTER_KEY, 0);
    current = 0;
  }
  console.log(`${TAG} Initial Jitsi participants: ${current}`);
  setIndicator(current > 0);
}

export async function initAllJitsiIndicators() {
  console.log("[jitsiIndicator] Initializing all Jitsi indicators");
  await bootstrapExtra();
  
  for (const room of jitsiRooms) {
    initJitsiIndicator(room);
  }
  
  console.log("[jitsiIndicator] All indicators initialized");
}
```

### Map Configuration

For the Jitsi tracker to work, your Tiled map needs proper Jitsi room setup:

#### Jitsi Area Properties
```
- jitsiRoom: "RoomName"           // Name of the Jitsi room
- jitsiTrigger: "onaction"         // How to trigger the room (onaction, onenter)
- jitsiTriggerMessage: "Message"   // Message shown to trigger the room
```

#### Occupancy Variable
```
- Name: "occ:RoomName"             // Must match the jitsiRoom property
- Type: variable object            // In the variables object layer
```

## Area-Based Interactions

### Area Detection
```typescript
WA.room.area.onEnter("areaName").subscribe(() => {
  console.log("Player entered area");
});

WA.room.area.onLeave("areaName").subscribe(() => {
  console.log("Player left area");
});
```

### Important Notes
- Area names must match exactly between Tiled map and script
- Use descriptive names that reflect the area's purpose
- Consider using prefixes like `jitsi-`, `trigger-`, or `zone-`

## Variable Management

### Persistent Variables
```typescript
// Save a variable
WA.state.saveVariable("variableName", value);

// Load a variable
const value = WA.state.loadVariable("variableName");

// Subscribe to variable changes
WA.state.onVariableChange("variableName").subscribe((val) => {
  console.log("Variable changed:", val);
});
```

### Best Practices
- Use descriptive variable names
- Initialize variables to avoid undefined values
- Use appropriate data types (number, string, boolean, object)

## Layer Management

### Showing/Hiding Layers
```typescript
// Show a layer
WA.room.showLayer("layerName");

// Hide a layer
WA.room.hideLayer("layerName");
```

### Layer Naming Conventions
- Use descriptive names
- Group related layers under folders (e.g., `furniture/layerName`)
- Use consistent naming across maps

## Best Practices

### 1. Initialization Order
```typescript
export async function initializeFeature(): Promise<void> {
  await WA.onInit();      // Always initialize API first
  await bootstrapExtra(); // Then bootstrap extended features
  // Then implement your logic
}
```

### 2. Error Handling
- Always handle potential null/undefined values
- Add console.log statements for debugging
- Consider fallback values for variables

### 3. Memory Management
- Subscriptions are automatically cleaned up when players leave
- For long-running operations, consider cleanup if needed

### 4. Naming Conventions
- Use camelCase for variable and function names
- Use descriptive names that reflect purpose
- Follow consistent patterns across files

## Common Patterns

### 1. Toggle-Based Features
```typescript
WA.state.onVariableChange("toggleVariable").subscribe((val) => {
  if (val === true) {
    // Activate feature
  } else {
    // Deactivate feature
  }
});
```

### 2. Player State Management
```typescript
WA.player.state.onEnter("someState").subscribe(() => {
  // Handle when player enters a specific state
});
```

### 3. Timed Events
```typescript
// Using setTimeout within WorkAdventure context
setTimeout(() => {
  // Perform delayed action
}, 1000);
```

## Debugging Tips

### 1. Console Logging
- Use descriptive tags in log messages
- Log important state changes
- Add timestamps when needed

### 2. Variable Monitoring
```typescript
WA.state.onVariableChange("variableName").subscribe((val) => {
  console.log("VariableName changed to:", val);
});
```

### 3. Browser Developer Tools
- Check browser console for errors
- Monitor network requests
- Use element inspection for DOM elements

### 4. Tiled Map Verification
- Verify area names match between map and script
- Check property values are correct
- Ensure map is properly linked to script file

## Testing

### Local Development
1. Run `npm run dev` for development server
2. Test features locally before deployment
3. Use different browser windows to simulate multiple players

### Production Build
- Run `npm run build` to create production build
- Check for TypeScript compilation errors
- Verify all features work in built version

## Conclusion

This guide covers the core concepts and implementation details for WorkAdventure scripting. The Jitsi tracker example demonstrates many important patterns that can be applied to other interactive features. Remember to follow best practices for maintainable and efficient scripts.




# **WorkAdventure Scripting API Guide: Concepts and Implementation**

The WorkAdventure Scripting API provides a powerful JavaScript interface allowing developers to add interactive logic and custom features to their maps. This guide serves as a comprehensive reference for the core concepts, architectural limitations, and key programming tools available within the global WA object.

## **Part One: Architectural Foundations and Environment**

### **1.1. Script Execution Environment**

Map scripts (specified via the script property in the map file) are always executed inside a sandboxed iframe created by WorkAdventure.1 This isolated environment is a fundamental security mechanism designed to prevent external scripts from directly manipulating the game engine (Phaser) or the main Document Object Model (DOM).2

**Key Map Script Restrictions:**

| Restriction | Description | Workaround |
| :---- | :---- | :---- |
| **Blocked External HTTP Requests (XHR/Fetch):** | The sandboxed iframe does not have an "Origin" (Origin: null). Consequently, the browser blocks all standard external network requests (fetch or XMLHttpRequest) due to the Same-Origin Policy.1 | 1\. Use **WebSockets** (which are not subject to CORS restrictions).1 2\. Use an embedded **Co-Website iFrame** as a mediator (which has a valid origin) and communicate with it using postMessage.1 |
| **Direct WorkAdventure Access:** | The script cannot directly interact with the WorkAdventure DOM or internal game objects.2 | All interactions are securely handled via the global WA object, which internally uses the window.postMessage() API to communicate between the sandboxed iframe and the main game.2 |

### **1.2. Script Lifecycle**

All scripts must begin by using the initialization promise to ensure that core data (such as the player's ID and position) is ready and accessible.3

* **WA.onInit(): Promise\<void\>:** All script logic must start inside this function. The promise resolves after the map is loaded and the current player is set up.3

JavaScript

WA.onInit().then(async () \=\> {  
    // Script logic begins here; WA.player and WA.players are ready.  
    console.log("WorkAdventure is ready\!");  
    // Example: Display the player's name  
    console.log(\`Welcome, ${WA.player.name}\`); \[4\]  
});

## **Part Two: Player Tracking (WA.players)**

The WA.players namespace is used to interact with and monitor other users (Remote Players) in the map.

### **2.1. Enabling Nearby Zone Tracking**

For performance reasons, not all players in the room are tracked by default. You must explicitly enable this feature. Tracking is limited to players within the **"nearby zone"** (i.e., visible to the current player or close to the viewport).5

* **WA.players.configureTracking(options?): Promise\<void\>:** Starts tracking nearby players.  
  * **Recommended Option:** await WA.players.configureTracking({ players: true, movement: false }); This is often preferred to track presence without consuming resources to track every movement update.5

### **2.2. Listening to Enter and Leave Events**

These are the primary methods for implementing a real-time presence system or counter:

| Function | Description | Typical Use Case |
| :---- | :---- | :---- |
| **WA.players.onPlayerEnters(): Observable\<RemotePlayerInterface\>** | Triggered when another player enters your nearby (visible) zone.5 | Used to increment a counter and send 'welcome' chat notifications.5 |
| **WA.players.onPlayerLeaves(): Observable\<RemotePlayerInterface\>** | Triggered when another player leaves your nearby zone.5 | Used to decrement the counter and send 'goodbye' notifications.5 |

JavaScript

// Example: Tracking enter and leave events  
WA.players.onPlayerEnters().subscribe((player) \=\> { \[5\]  
    WA.chat.sendChatMessage(\`Hello\! ${player.name} just entered your area.\`, "Presence Tracker"); \[6\]  
});

### **2.3. Getting the Current Player List**

* **WA.players.list(): IterableIterator\<RemotePlayerInterface\>:** Returns a list of players currently in the nearby zone at the time the function is called. This is essential for determining the initial player count when the script loads.5

## **Part Three: User Interface Tools (WA.ui)**

The WA.ui namespace is used to create custom UI elements that interact with the map logic.

| Function | Description | Use Case |
| :---- | :---- | :---- |
| **WA.ui.registerMenuCommand(commandDescriptor, options): Menu** | Creates a custom menu command (usually appearing as a button in the toolbar). This is the ideal solution for a visible "counter" whose text can be dynamically updated.7 | Store the returned Menu reference to update its label property in real-time with the current player count. |
| **WA.ui.openPopup(targetObject, message, buttons): Popup** | Opens a positioned popup window based on an object defined in Tiled.7 | Used to display detailed alerts or player lists when a user interacts with a custom element. |

## **Part Four: Current Player Data (WA.player)**

The WA.player object contains information specific to the player currently running the script.

| Property/Function | Description |
| :---- | :---- |
| **WA.player.name: string** | The display name of the current player.4 |
| **WA.player.id: string** | A unique identifier for the current character on the map.4 |
| **WA.player.getPosition(): Promise\<Position\>** | An asynchronous function that returns the player's current x and y coordinates in pixels. Essential for location tracking (Heartbeat).3 |
| **WA.player.userRoomToken: string** | An authentication token that can be used by external services to authenticate the player and verify their presence in the current room (crucial for secure external tracking).4 |

## **Part Five: Internal Communication and Data Exchange**

### **5.1. Chat**

* **WA.chat.sendChatMessage(message: string, author: string): void:** Used to send a message to the main chat channel with a custom author name (e.g., "Presence Monitor").6

### **5.2. Events**

Events are used to send real-time, short-lived messages between players in the room.8

* **WA.event.broadcast(key: string, data: unknown): Promise\<void\>:** Used to send a JSON payload to all players in the room.9  
* **WA.event.on(key: string).subscribe((event) \=\> {}):** Used to listen for events broadcast by other players.10

### **5.3. Shared Variables**

Variables allow storing data either attached to a specific player or shared across the entire room.

* **Player Variables:** Use WA.player.state to read or write public/private variables attached to the current player. Public variables are visible to nearby players via RemotePlayer.state.4  
* **Room Variables:** Use WA.state.saveVariable(key, data) and WA.state.onVariableChange(key).subscribe() to store state shared among **all** players in the room (e.g., a shared game score or environmental variables).11

#### **المصادر التي تم الاقتباس منها**

1. Scripting Internals | WorkAdventure Documentation, تم الوصول بتاريخ ‎أكتوبر 20, 2025، [https://docs.workadventu.re/developer/map-scripting/scripting-internals/](https://docs.workadventu.re/developer/map-scripting/scripting-internals/)  
2. docs/dev/contributing-to-scripting-api.md · test · Huste, Tobias / workadventure, تم الوصول بتاريخ ‎أكتوبر 20, 2025، [https://codebase.helmholtz.cloud/frust45/workadventure/-/blob/test/docs/dev/contributing-to-scripting-api.md](https://codebase.helmholtz.cloud/frust45/workadventure/-/blob/test/docs/dev/contributing-to-scripting-api.md)  
3. Player \- WorkAdventure Documentation | PDF | Variable (Computer Science) \- Scribd, تم الوصول بتاريخ ‎أكتوبر 20, 2025، [https://www.scribd.com/document/836363754/Player-WorkAdventure-Documentation](https://www.scribd.com/document/836363754/Player-WorkAdventure-Documentation)  
4. Player | WorkAdventure Documentation, تم الوصول بتاريخ ‎أكتوبر 20, 2025، [https://docs.workadventu.re/developer/map-scripting/references/api-player/](https://docs.workadventu.re/developer/map-scripting/references/api-player/)  
5. Players | WorkAdventure Documentation, تم الوصول بتاريخ ‎أكتوبر 20, 2025، [https://docs.workadventu.re/developer/map-scripting/references/api-players/](https://docs.workadventu.re/developer/map-scripting/references/api-players/)  
6. Map Scripting API \- WorkAdventure Documentation, تم الوصول بتاريخ ‎أكتوبر 20, 2025، [https://docs.workadventu.re/developer/map-scripting/](https://docs.workadventu.re/developer/map-scripting/)  
7. UI | WorkAdventure Documentation, تم الوصول بتاريخ ‎أكتوبر 20, 2025، [https://docs.workadventu.re/developer/map-scripting/references/api-ui/](https://docs.workadventu.re/developer/map-scripting/references/api-ui/)  
8. Writing WebSocket client applications \- Web APIs \- MDN, تم الوصول بتاريخ ‎أكتوبر 20, 2025، [https://developer.mozilla.org/en-US/docs/Web/API/WebSockets\_API/Writing\_WebSocket\_client\_applications](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API/Writing_WebSocket_client_applications)  
9. Event | WorkAdventure Documentation, تم الوصول بتاريخ ‎أكتوبر 20, 2025، [https://docs.workadventu.re/developer/map-scripting/references/api-event/](https://docs.workadventu.re/developer/map-scripting/references/api-event/)  
10. Events | WorkAdventure Documentation, تم الوصول بتاريخ ‎أكتوبر 20, 2025، [https://docs.workadventu.re/developer/map-scripting/events/](https://docs.workadventu.re/developer/map-scripting/events/)  
11. Integrated websites | WorkAdventure Documentation, تم الوصول بتاريخ ‎أكتوبر 20, 2025، [https://docs.workadventu.re/map-building/tiled-editor/website-in-map/](https://docs.workadventu.re/map-building/tiled-editor/website-in-map/)