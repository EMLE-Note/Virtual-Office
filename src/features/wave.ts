// Wave-only via Zone + ActionMessage (SPACE to open list)
export {}; // for --isolatedModules

// ====== Types & consts ======
interface Position { x: number; y: number; }
interface WaveEvent {
  type: "wave";
  fromId: string | number | undefined;
  fromName: string;
  toId: string | number | undefined;
  toName: string;
  at: string;              // ISO
  fromPos?: Position | null;
}
const WAVE_EVENT = "wave:event";
const HUD_ZONE   = "wave-hud"; // لازم تعمل Zone بالاسم ده على الخريطة

// ====== Utils ======
const nowIso = () => new Date().toISOString();

async function me() {
  return {
    id: (WA.player as any)?.id as any,
    name: (WA.player as any)?.name || "مجهول",
  };
}

async function myPos(): Promise<Position | null> {
  try {
    if ((WA.player as any)?.getPosition) {
      return await (WA.player as any).getPosition();
    }
  } catch {}
  return null;
}

async function listPlayers(): Promise<any[]> {
  try {
    if ((WA.players as any)?.list) {
      const it = await (WA.players as any).list();
      return Array.from(it as IterableIterator<any>);
    }
  } catch {}
  return [];
}

// ====== Core ======
async function sendWave(target: any) {
  const self = await me();
  const pos  = await myPos();
  const evt: WaveEvent = {
    type: "wave",
    fromId: self.id,
    fromName: self.name,
    toId: target.id,
    toName: target.name || "مجهول",
    at: nowIso(),
    fromPos: pos || undefined,
  };
  (WA.event as any).broadcast(WAVE_EVENT, evt);
}

// استلام أي Wave → Toast للجميع
(WA.event as any).on(WAVE_EVENT).subscribe((raw: any) => {
  const w = raw as WaveEvent;
  (WA.ui as any).displayActionMessage({
    message: `👋 ${w.fromName} نادى على ${w.toName}`,
    callback: async () => {}, // Promise<void>
  });
});

// Popup لاختيار شخص
async function openChoosePlayerPopup() {
  const self = await me();
  const players = (await listPlayers()).filter((p: any) => p.id !== self.id);

  if (!players.length) {
    (WA.ui as any).openPopup("wave-none", "لا يوجد لاعبين آخرين الآن.", [
      { label: "حسنًا", callback: async () => {} },
    ]);
    return;
  }

  const MAX = 12;
  const buttons = players.slice(0, MAX).map((p: any) => ({
    label: `👋 ${p.name || "بدون اسم"}`,
    callback: async () => { await sendWave(p); },
  }));

  if (players.length > MAX) {
    buttons.push({
      label: `+${players.length - MAX} آخرين…`,
      callback: async () => {
        (WA.ui as any).displayActionMessage({
          message: "القائمة طويلة—اختر الأقرب لك.",
          callback: async () => {},
        });
      },
    } as any);
  }

  (WA.ui as any).openPopup(
    "wave-choose-player",
    "اختَر الشخص اللي عايز تنادي عليه:",
    buttons as any
  );
}

// ====== Hook على الزون: Enter → action message (SPACE) ======
WA.onInit().then(() => {
  // لما تدخل زون wave-hud يظهر تنبيه مع "زر فعل" (SPACE/Enter)
  (WA.room as any)?.onEnterZone?.(HUD_ZONE, () => {
    (WA.ui as any).displayActionMessage({
      message: "اضغط مسافة لفتح قائمة 👋 Wave",
      callback: async () => { await openChoosePlayerPopup(); }, // يُستدعى عند الضغط على Space
    });
  });

  // (اختياري) عند الخروج من الزون نعرض رسالة خفيفة
  (WA.room as any)?.onLeaveZone?.(HUD_ZONE, () => {
    (WA.ui as any).displayActionMessage({
      message: "خرجت من منطقة Wave.",
      callback: async () => {},
    });
  });

  // تلميح مرة واحدة بعد التحميل
  setTimeout(() => {
    (WA.ui as any).displayActionMessage({
      message: "ادخل منطقة Wave ثم اضغط مسافة لعمل 👋",
      callback: async () => {},
    });
  }, 700);
});
