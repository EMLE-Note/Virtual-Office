// src/features/wave.ts
// Floating "👋 Wave" button -> choose player -> broadcast wave (no replies)
export {}; // required for --isolatedModules

// ---------- Types ----------
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

// ---------- Consts ----------
const WAVE_EVENT = "wave:event";
const FLOAT_ID = "wa-float-wave-btn";

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
  const self = await me();
  const pos = await myPos();
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
    callback: async () => {},
  });
});

// ---------- UI: popup لاختيار شخص ----------
function openChoosePlayerPopup() {
  (async () => {
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
  })();
}

// ---------- Floating button ----------
function createFloatingWaveButton() {
  // لو موجود بالفعل بلاش نكرره
  if (document.getElementById(FLOAT_ID)) return;

  const style = document.createElement('style');
  style.textContent = `
    #${FLOAT_ID} {
      position: fixed; right: 20px; bottom: 20px; z-index: 99999;
      padding: 10px 14px; border: none; border-radius: 10px;
      background: #3b82f6; color: #fff; font-weight: 600; cursor: pointer;
      box-shadow: 0 6px 18px rgba(0,0,0,.18);
    }
    #${FLOAT_ID}:hover { filter: brightness(1.06); }
  `;
  document.head.appendChild(style);

  const btn = document.createElement('button');
  btn.id = FLOAT_ID;
  btn.textContent = '👋 Wave';
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    openChoosePlayerPopup();
  });
  document.body.appendChild(btn);
}

// ---------- Init ----------
WA.onInit().then(() => {
  createFloatingWaveButton();
  setTimeout(() => {
    (WA.ui as any).displayActionMessage({
      message: "اضغط زر 👋 Wave (أسفل يمين) ثم اختر الموظف.",
      callback: async () => {},
    });
  }, 700);
});
