/// <reference types="@workadventure/iframe-api-typings" />
import { bootstrapExtra } from "@workadventure/scripting-api-extra";

export type JitsiIndicatorConfig = {
  jitsiRoomName: string;
  indicatorLayer: string;
};

// تكوين غرفة Operations
const jitsiRooms: JitsiIndicatorConfig[] = [
  { jitsiRoomName: "Operations", indicatorLayer: "furniture/Jitsi_Indicator" },
];

function initJitsiIndicator(config: JitsiIndicatorConfig) {
  const TAG = `[jitsiIndicator:${config.jitsiRoomName}]`;
  // المتغير الذي يتتبع عدد المشاركين في مكالمة Jitsي
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

  // الاستماع لتغييرات عدد المشاركين في مكالمة Jitsي
  WA.state.onVariableChange(JITSI_COUNTER_KEY).subscribe((val: unknown) => {
    const participantsCount = typeof val === "number" ? val : 0;
    console.log(`${TAG} Jitsi participants count: ${participantsCount}`);
    // إظهار المؤشر فقط إذا كان هناك مشاركين في المكالمة
    setIndicator(participantsCount > 0);
  });

  // التحقق من القيمة الأولية
  let current = WA.state.loadVariable(JITSI_COUNTER_KEY) as number | null;
  if (current === null || current === undefined) {
    WA.state.saveVariable(JITSI_COUNTER_KEY, 0);
    current = 0;
  }
  console.log(`${TAG} Initial Jitsi participants: ${current}`);
  setIndicator(current > 0);

  // Track when players enter and leave the Jitsi area
  // Note: This doesn't directly track if the Jitsi call is active, just area presence
  WA.room.area.onEnter(config.jitsiRoomName).subscribe(() => {
    console.log(`${TAG} Player entered area`);
  });

  WA.room.area.onLeave(config.jitsiRoomName).subscribe(() => {
    console.log(`${TAG} Player left area`);
  });
}

export async function initAllJitsiIndicators() {
  console.log("[jitsiIndicator] Initializing all Jitsi indicators");
  await bootstrapExtra();
  
  for (const room of jitsiRooms) {
    initJitsiIndicator(room);
  }
  
  console.log("[jitsiIndicator] All indicators initialized");
}