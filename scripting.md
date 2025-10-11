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