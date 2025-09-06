// src/features/wave.ts
// Wave feature (TypeScript, no backend) — compatible with isolatedModules & starter kit
export {}; // مهم لـ --isolatedModules

// ------------------- Types -------------------
interface Position {
  x: number;
  y: number;
}

// أساس مشترك من غير حقل type
interface WaveCommon {
  fromId: string | number | undefined;
  fromName: string;
  toId: string | number | undefined;
  toName: string;
  fromPos?: Position | null;
  at: string; // ISO
}

// كل حدث له نوعه
interface WavePayload extends WaveCommon {
  type: "wave";
}

interface WaveAckPayload extends WaveCommon {
  type: "wave-ack";
  ackById: string | number | undefined;
  ackByName: string;
  ackAt: string; // ISO
}

interface WaveGoPayload extends WaveCommon {
  type: "wave-go";
  goById: string | number | undefined;
  goByName: string;
  goAt: string; // ISO
}

type FeedEntry = WavePayload | WaveAckPayload | WaveGoPayload;

const WAVE_EVENT = "wave:event";
const WAVE_ACK_EVENT = "wave:ack";
const WAVE_GO_EVENT = "wave:go";
const FEED_KEY = "wave:publicFeed";
const FEED_MAX = 30;
const FEED_POPUP_ID = "wave-feed";
const INCOMING_POPUP_ID = "wave-incoming";
const HELP_ZONE_NAME = "wave-hud";

// ------------------- Utils -------------------
function nowIso(): string {
  return new Date().toISOString();
}

function timeAgo(tsIso: string): string {
  const diff = Date.now() - Date.parse(tsIso || new Date().toISOString());
  const s = Math.max(1, Math.floor(diff / 1000));
  if (s < 60) return `${s} ثانية`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} دقيقة`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} ساعة`;
  const d = Math.floor(h / 24);
  return `${d} يوم`;
}

async function loadFeed(): Promise<FeedEntry[]> {
  try {
    const v = (await (WA.state as any).loadVariable(FEED_KEY)) as FeedEntry[] | null | undefined;
    return v ?? [];
  } catch {
    return JSON.parse(localStorage.getItem(FEED_KEY) || "[]") as FeedEntry[];
  }
}

async function saveFeed(arr: FeedEntry[]): Promise<void> {
  const trimmed = arr.slice(-FEED_MAX);
  try {
    await (WA.state as any).saveVariable(FEED_KEY, trimmed);
  } catch {
    localStorage.setItem(FEED_KEY, JSON.stringify(trimmed));
  }
}

async function pushToFeed(entry: FeedEntry): Promise<void> {
  const feed = await loadFeed();
  feed.push(entry);
  await saveFeed(feed);
}

async function getSelf() {
  const id = (WA.player as any)?.id as string | number | undefined;
  const name = (WA.player as any)?.name || "مجهول";
  return { id, name };
}

async function getPositionSafe(): Promise<Position | null> {
  try {
    if ((WA.player as any)?.getPosition) {
      return await (WA.player as any).getPosition();
    }
  } catch {}
  return null;
}

async function listPlayersSafe(): Promise<any[]> {
  try {
    if ((WA.players as any)?.list) {
      const it = await (WA.players as any).list();
      return Array.from(it as IterableIterator<any>); // Iterator → Array
    }
  } catch {}
  return [];
}

async function nearestPlayer(): Promise<any | null> {
  const me = await getSelf();
  const myPos = await getPositionSafe();
  const players = (await listPlayersSafe()).filter((p: any) => p.id !== me.id);
  if (!players.length) return null;
  if (!myPos || !players[0]?.position) return players[0];
  let best = players[0];
  let bestD = Infinity;
  for (const p of players) {
    const dx = ((p.position?.x ?? 0) as number) - myPos.x;
    const dy = ((p.position?.y ?? 0) as number) - myPos.y;
    const d = dx * dx + dy * dy;
    if (d < bestD) {
      bestD = d;
      best = p;
    }
  }
  return best;
}

// ------------------- Feed popup -------------------
let feedPopupOpen = false;
let feedPopupHandle: any | null = null;

async function renderFeedPopup(): Promise<void> {
  const feed = await loadFeed();
  const lines = feed
    .map((e: FeedEntry) => {
      if (e.type === "wave")
        return `🕒 ${timeAgo(e.at)}: ${e.fromName} 👋 → ${e.toName}`;
      if (e.type === "wave-ack")
        return `🕒 ${timeAgo((e as WaveAckPayload).ackAt)}: ${(e as WaveAckPayload).ackByName} رد 👋 لـ ${e.fromName}`;
      if (e.type === "wave-go")
        return `🕒 ${timeAgo((e as WaveGoPayload).goAt)}: ${(e as WaveGoPayload).goByName} رايح لـ ${e.fromName} 🚶`;
      return `🕒 حدث Wave`;
    })
    .join("\n");

  if (!feedPopupOpen) return;

  feedPopupHandle = (WA.ui as any).openPopup(
    FEED_POPUP_ID,
    `Wave Feed (يظهر للجميع)\n\n${lines || "لا أحداث بعد"}`,
    [
      { label: "إغلاق", callback: () => { feedPopupOpen = false; try { feedPopupHandle?.close(); } catch {} } },
      { label: "تحديث", callback: () => { renderFeedPopup(); } },
    ]
  );
}

function openFeed(): void {
  feedPopupOpen = true;
  renderFeedPopup();
}

// يحدث تلقائيًا كل دقيقة لو مفتوح
setInterval(() => { if (feedPopupOpen) renderFeedPopup(); }, 60_000);

// راقب تغيّر متغير الحالة المشترك (لو متاح)
(WA.state as any)?.onVariableChange?.(FEED_KEY)?.subscribe?.(() => { if (feedPopupOpen) renderFeedPopup(); });

// ------------------- UI helpers -------------------
function showHelpToast(): void {
  (WA.ui as any).displayActionMessage({
    message: "من القائمة: 👋 Wave: Send — 📜 Wave: Open Feed",
    callback: () => {}
  });
}

// ------------------- Core actions -------------------
async function sendWaveTo(target: any): Promise<void> {
  const me = await getSelf();
  const myPos = await getPositionSafe();
  const payload: WavePayload = {
    type: "wave",
    fromId: me.id,
    fromName: me.name,
    toId: target.id,
    toName: target.name || "مجهول",
    fromPos: myPos || undefined,
    at: nowIso(),
  };
  (WA.event as any).broadcast(WAVE_EVENT, payload);
  await pushToFeed(payload);
  try {
    (WA.chat as any)?.sendChatMessage?.(`👋 ${me.name} نادى على ${payload.toName}`, "WaveBot");
  } catch {}
}

let incomingPopupHandle: any | null = null;

function showIncomingWaveToast(data: WavePayload): void {
  try { incomingPopupHandle?.close?.(); } catch {}
  incomingPopupHandle = (WA.ui as any).openPopup(
    INCOMING_POPUP_ID,
    `👋 ${data.fromName} نادى عليك — (${timeAgo(data.at)})`,
    [
      {
        label: "رد 👋",
        callback: async () => {
          const me = await getSelf();
          const ack: WaveAckPayload = {
            ...data,
            type: "wave-ack",
            ackById: me.id,
            ackByName: me.name,
            ackAt: nowIso()
          };
          (WA.event as any).broadcast(WAVE_ACK_EVENT, ack);
          await pushToFeed(ack);
          try { incomingPopupHandle?.close?.(); } catch {}
        }
      },
      {
        label: "جاي لك 🚶",
        callback: async () => {
          const me = await getSelf();
          const go: WaveGoPayload = {
            ...data,
            type: "wave-go",
            goById: me.id,
            goByName: me.name,
            goAt: nowIso()
          };
          (WA.event as any).broadcast(WAVE_GO_EVENT, go);
          await pushToFeed(go);

          const targetPos = data.fromPos;
          try {
            if (targetPos) {
              if ((WA.player as any)?.teleport) {
                (WA.player as any).teleport(targetPos.x, targetPos.y);
              } else if ((WA.player as any)?.moveTo) {
                (WA.player as any).moveTo(targetPos.x, targetPos.y);
              } else if ((WA.camera as any)?.set) {
                (WA.camera as any).set(targetPos.x, targetPos.y);
                (WA.ui as any).displayActionMessage({ message: "تم تحديد مكانه على الخريطة 🔖", callback: () => {} });
              } else {
                (WA.ui as any).displayActionMessage({ message: "تعذّر التحريك—اتّبع الخريطة يدويًا", callback: () => {} });
              }
            }
          } catch (e) {
            console.warn("Go failed", e);
          }
          try { incomingPopupHandle?.close?.(); } catch {}
        }
      },
      { label: "إغلاق", callback: () => { try { incomingPopupHandle?.close?.(); } catch {} } }
    ]
  );
}

// ------------------- Events -------------------
(WA.event as any).on(WAVE_EVENT).subscribe((raw: any) => {
  const data = raw as WavePayload;
  pushToFeed(data);
  const myId = (WA.player as any)?.id;
  if (data.toId === myId) showIncomingWaveToast(data);
});

(WA.event as any).on(WAVE_ACK_EVENT).subscribe((raw: any) => {
  const data = raw as WaveAckPayload;
  pushToFeed(data);
  (WA.ui as any).displayActionMessage({
    message: `👋 ${data.ackByName} رد على Wave من ${data.fromName} — (${timeAgo(data.ackAt)})`,
    callback: () => {}
  });
});

(WA.event as any).on(WAVE_GO_EVENT).subscribe((raw: any) => {
  const data = raw as WaveGoPayload;
  pushToFeed(data);
  (WA.ui as any).displayActionMessage({
    message: `🚶 ${data.goByName} رايح لـ ${data.fromName} — (${timeAgo(data.goAt)})`,
    callback: () => {}
  });
});

// ------------------- Triggers (Menu commands) -------------------
(WA.ui as any).registerMenuCommand?.("👋 Wave: Send", async () => {
  const target = await nearestPlayer();
  if (!target) {
    (WA.ui as any).openPopup("wave-none", "لا يوجد لاعبون بالقرب لإرسال Wave.", [
      { label: "حسنا", callback: () => {} }
    ]);
    return;
  }
  await sendWaveTo(target);
});

(WA.ui as any).registerMenuCommand?.("📜 Wave: Open Feed", () => {
  openFeed();
});

// Hint عند دخول زون اسمها wave-hud (اختياري)
(WA.room as any)?.onEnterZone?.(HELP_ZONE_NAME, () => showHelpToast());

// رسالة ترحيب بعد init
WA.onInit().then(() => {
  setTimeout(() => {
    (WA.ui as any).displayActionMessage({
      message: "Wave جاهز: من القائمة اختر 👋 Wave: Send — 📜 Wave: Open Feed",
      callback: () => {}
    });
  }, 800);
});
