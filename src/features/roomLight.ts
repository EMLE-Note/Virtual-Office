/// <reference types="@workadventure/iframe-api-typings" />
import { bootstrapExtra } from "@workadventure/scripting-api-extra";

export type RoomConfig = {
  area: string;
  layer: string;
};

function initRoomLight(config: RoomConfig) {
  const TAG = `[roomLight:${config.area}]`;
  try {
    console.log(`${TAG} init()`);

    // حماية لو الـ WA API مش جاهز
    if (typeof WA === "undefined" || !WA.state || !WA.room || !WA.room.area) {
      console.error(`${TAG} WA APIs not ready`, {
        WA: typeof WA === "undefined" ? "undefined" : "exists",
        hasState: !!(WA && WA.state),
        hasRoom: !!(WA && WA.room),
        hasArea: !!(WA && WA.room && WA.room.area),
      });
      return;
    }

    const COUNTER_KEY = `occ:${config.area}`;

    function setLights(on: boolean) {
      try {
        console.log(`${TAG} setLights -> ${on ? "ON (hide " + config.layer + ")" : "OFF (show " + config.layer + ")"}`);
        if (on) {
          WA.room.hideLayer(config.layer);
        } else {
          WA.room.showLayer(config.layer);
        }
      } catch (e) {
        console.error(`${TAG} setLights error for layer "${config.layer}"`, e);
      }
    }

    // استمع لتغيّر المتغير المشترك
    try {
      WA.state.onVariableChange(COUNTER_KEY).subscribe((val: unknown) => {
        const n = typeof val === "number" ? val : (val === null || val === undefined ? 0 : Number(val) || 0);
        console.log(`${TAG} onVariableChange ->`, n);
        setLights(n > 0);
      });
    } catch (e) {
      console.error(`${TAG} failed to subscribe onVariableChange`, e);
    }

    // اقرأ الحالة الحالية (لو مش موجودة، ثبت 0)
    const raw = WA.state.loadVariable(COUNTER_KEY);
    console.log(`${TAG} loadVariable ->`, raw);
    const current = typeof raw === "number" ? raw : (raw === null || raw === undefined ? null : Number(raw) || 0);
    if (current === null) {
      console.log(`${TAG} initializing counter to 0`);
      WA.state.saveVariable(COUNTER_KEY, 0);
    }

    // اضبط الإضاءة عند البداية حسب الحالة
    setLights((current ?? 0) > 0);

    // دخول/خروج: عدّل العداد (التغيير في الـ state هيوصّل لكل الكلاينتس)
    WA.room.area.onEnter(config.area).subscribe(() => {
      console.log(`${TAG} onEnter triggered`);
      const n = (WA.state.loadVariable(COUNTER_KEY) as number) ?? 0;
      WA.state.saveVariable(COUNTER_KEY, n + 1);
    });

    WA.room.area.onLeave(config.area).subscribe(() => {
      console.log(`${TAG} onLeave triggered`);
      const n = (WA.state.loadVariable(COUNTER_KEY) as number) ?? 0;
      WA.state.saveVariable(COUNTER_KEY, Math.max(0, n - 1));
    });
  } catch (err) {
    console.error(`${TAG} init error`, err);
  }
}

export async function initAllRoomLights(rooms: RoomConfig[]) {
  console.log("[roomLight] initAllRoomLights called", rooms);
  await bootstrapExtra();
  for (const room of rooms) {
    initRoomLight(room);
  }
}
