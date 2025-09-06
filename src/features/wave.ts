// src/features/wave.ts
// Minimal "Wave someone" via menu command — no backend, no DOM hacking.
export {}; // needed for --isolatedModules

// ---------- Types ----------
interface Position { x: number; y: number; }

interface WaveBase {
  fromId: string | number | undefined;
  fromName: string;
  toId: string | number | undefined;
  toName: string;
  fromPos?: Position | null;
  at: string; // ISO
}

interface WaveEvent extends WaveBase { type: "wave"; }
interface WaveAckEvent extends WaveBase {
  type: "wave-ack";
  ackById: string | number | undefined;
  ackByName: string;
  ackAt: string; // ISO
}
interface WaveTalkEvent extends WaveBase {
  type: "wave-talk";
  talkById: string | number | undefined;
  talkByName: string;
  talkAt: string; // ISO
}

// ---------- Consts ----------
const WAVE_EVENT = "wave:event";
const WAVE_ACK_EVENT = "wave:ack";
const WAVE_TALK_EVENT = "wave:talk";

// ---------- Utils ----------
const nowIso = () => new Date().toISOString();
function timeAgo(tsIso: string): string {
  const s = Math.max(1, Math.floor((Date.now() - Date.parse(tsIso || nowIso())) / 1000));
  if (s < 60) return `${s} ثانية`;
  const m = Math.floor(s/60); if (m < 60) return `${m} دقيقة`;
  const h = Math.floor(m/60); if (h < 24) return `${h} ساعة`;
  const d = Math.floor(h/24); return `${d} يوم`;
}

async function me() {
  return { id: (WA.player as any)?.id as any, name: (WA.player as any)?.name || "مجهول" };
}
async function myPos(): Promise<Position | null> {
  try { if ((WA.player as any)?.getPosition) return await (WA.player as any).getPosition(); } catch {}
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

// ---------- Core actions ----------
async function sendWave(target: any) {
  const m = await me();
  const pos = await myPos();
  const evt: WaveEvent = {
    type: "wave",
    fromId: m.id, fromName: m.name,
    toId: target.id, toName: target.name || "مجهول",
    fromPos: pos || undefined,
    at: nowIso()
  };
  (WA.event as any).broadcast(WAVE_EVENT, evt);
  // إعلان بسيط للجميع (اختياري)
  try { (WA.ui as any).displayActionMessage({ message: `👋 ${m.name} نادى على ${evt.toName}`, callback: () => {} }); } catch {}
}

function onIncomingWave(w: WaveEvent) {
  // Toast للجميع
  (WA.ui as any).displayActionMessage({
    message: `👋 ${w.fromName} نادى على ${w.toName} — ${timeAgo(w.at)}`,
    callback: () => {}
  });

  // لو أنا المستلم -> خيارات
  const myId = (WA.player as any)?.id;
  if (w.toId !== myId) return;

  const handle = (WA.ui as any).openPopup(
    "wave-incoming",
    `👋 ${w.fromName} نادى عليك — (${timeAgo(w.at)})`,
    [
      {
        label: "رد 👋",
        callback: async () => {
          const m = await me();
          const ack: WaveAckEvent = {
            ...w,
            type: "wave-ack",
            ackById: m.id,
            ackByName: m.name,
            ackAt: nowIso()
          };
          (WA.event as any).broadcast(WAVE_ACK_EVENT, ack);
          try { (handle as any)?.close?.(); } catch {}
        }
      },
      {
        label: "Talk To",
        callback: async () => {
          const m = await me();
          const talk: WaveTalkEvent = {
            ...w,
            type: "wave-talk",
            talkById: m.id,
            talkByName: m.name,
            talkAt: nowIso()
          };
          (WA.event as any).broadcast(WAVE_TALK_EVENT, talk);

          // روح لمكان المرسل (أبسط تنفيذ ممكن)
          const p = w.fromPos;
          try {
            if (p) {
              if ((WA.player as any)?.teleport) (WA.player as any).teleport(p.x, p.y);
              else if ((WA.player as any)?.moveTo) (WA.player as any).moveTo(p.x, p.y);
              else if ((WA.camera as any)?.set) { (WA.camera as any).set(p.x, p.y); (WA.ui as any).displayActionMessage({ message: "تم تحديد المكان 🔖", callback: () => {} }); }
            }
          } catch (e) { console.warn("TalkTo move failed", e); }

          try { (handle as any)?.close?.(); } catch {}
        }
      },
      { label: "إغلاق", callback: () => { try { (handle as any)?.close?.(); } catch {} } }
    ]
  );
}

// ---------- Event listeners ----------
(WA.event as any).on(WAVE_EVENT).subscribe((raw: any) => {
  const w = raw as WaveEvent;
  onIncomingWave(w);
});
(WA.event as any).on(WAVE_ACK_EVENT).subscribe((raw: any) => {
  const a = raw as WaveAckEvent;
  (WA.ui as any).displayActionMessage({
    message: `✅ ${a.ackByName} رد 👋 على ${a.fromName} — ${timeAgo(a.ackAt)}`,
    callback: () => {}
  });
});
(WA.event as any).on(WAVE_TALK_EVENT).subscribe((raw: any) => {
  const t = raw as WaveTalkEvent;
  (WA.ui as any).displayActionMessage({
    message: `🎤 ${t.talkByName} عمل Talk To مع ${t.fromName} — ${timeAgo(t.talkAt)}`,
    callback: () => {}
  });
});

// ---------- UI: menu command -> choose player ----------
function openChoosePlayerPopup() {
  (async () => {
    const m = await me();
    const players = (await listPlayers()).filter((p: any) => p.id !== m.id);

    if (!players.length) {
      (WA.ui as any).openPopup("wave-none", "لا يوجد لاعبين آخرين الآن.", [
        { label: "حسنًا", callback: () => {} }
      ]);
      return;
    }

    // نبني أزرار لكل لاعب (حد أقصى 10 لتبسيط التجربة)
    const MAX = 10;
    const buttons = players.slice(0, MAX).map((p: any) => ({
      label: `👋 ${p.name || "بدون اسم"}`,
      callback: async () => {
        await sendWave(p);
      }
    }));

    // لو أكتر من 10، نعرض تنبيه مبسّط
    if (players.length > MAX) {
      buttons.push({
        label: `+${players.length - MAX} آخرين…`,
        callback: () => {
          (WA.ui as any).displayActionMessage({
            message: "قائمة طويلة — جرّب تقليل العدد بالقرب منك.",
            callback: () => {}
          });
        }
      });
    }

    (WA.ui as any).openPopup(
      "wave-choose-player",
      "اختار الشخص اللي عايز تنادي عليه:",
      buttons
    );
  })();
}

// ---------- Register menu command ----------
(WA.ui as any).registerMenuCommand?.("👋 Wave someone", () => openChoosePlayerPopup());

// ---------- Init hint ----------
WA.onInit().then(() => {
  setTimeout(() => {
    (WA.ui as any).displayActionMessage({
      message: "من القائمة الجانبية اختر: 👋 Wave someone — ثم اختر الموظف.",
      callback: () => {}
    });
  }, 800);
});
