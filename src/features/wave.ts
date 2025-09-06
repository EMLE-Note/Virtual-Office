// src/features/wave.ts
// Minimal Wave-only feature (no replies) — menu pick & broadcast
export {}; // for --isolatedModules

// ---------- Types ----------
interface Position { x: number; y: number; }
interface WaveEvent {
  type: "wave";
  fromId: string | number | undefined;
  fromName: string;
  toId: string | number | undefined;
  toName: string;
  at: string;              // ISO timestamp
  fromPos?: Position | null;
}

// ---------- Consts ----------
const WAVE_EVENT = "wave:event";

// ---------- Utils ----------
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

// ---------- Core ----------
async function sendWave(target: any) {
  const meInfo = await me();
  const pos = await myPos();
  const evt: WaveEvent = {
    type: "wave",
    fromId: meInfo.id,
    fromName: meInfo.name,
    toId: target.id,
    toName: target.name || "مجهول",
    at: nowIso(),
    fromPos: pos || undefined,
  };
  (WA.event as any).broadcast(WAVE_EVENT, evt);
}

// Receive waves → show toast to everyone
(WA.event as any).on(WAVE_EVENT).subscribe((raw: any) => {
  const w = raw as WaveEvent;
  (WA.ui as any).displayActionMessage({
    message: `👋 ${w.fromName} نادى على ${w.toName}`,
    callback: () => {},
  });
});

// ---------- UI: menu command -> choose player ----------
function openChoosePlayerPopup() {
  (async () => {
    const self = await me();
    const players = (await listPlayers()).filter((p: any) => p.id !== self.id);

    if (!players.length) {
      (WA.ui as any).openPopup("wave-none", "لا يوجد لاعبين آخرين الآن.", [
        { label: "حسنًا", callback: () => {} },
      ]);
      return;
    }

    // Build buttons (cap at 12 to keep UI tidy)
    const MAX = 12;
    const buttons = players.slice(0, MAX).map((p: any) => ({
      label: `👋 ${p.name || "بدون اسم"}`,
      callback: async () => {
        await sendWave(p);
      },
    }));

    if (players.length > MAX) {
      buttons.push({
        label: `+${players.length - MAX} آخرين…`,
        callback: () => {
          (WA.ui as any).displayActionMessage({
            message: "القائمة طويلة—اختر الأقرب لك.",
            callback: () => {},
          });
        },
      });
    }

    (WA.ui as any).openPopup(
      "wave-choose-player",
      "اختَر الشخص اللي عايز تنادي عليه:",
      buttons
    );
  })();
}

// Register menu command
(WA.ui as any).registerMenuCommand?.("👋 Wave someone", () => openChoosePlayerPopup());

// Optional: hint on load
WA.onInit().then(() => {
  setTimeout(() => {
    (WA.ui as any).displayActionMessage({
      message: "من القائمة الجانبية اختر: 👋 Wave someone — ثم اختر الموظف.",
      callback: () => {},
    });
  }, 800);
});
