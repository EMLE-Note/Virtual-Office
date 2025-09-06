// src/features/wave.ts
// Wave feature (TypeScript, no backend) — adds a "Wave" button next to "Talk To" in the player card
export {}; // required for --isolatedModules

// ------------------- Types -------------------
interface Position { x: number; y: number; }

interface WaveCommon {
  fromId: string | number | undefined;
  fromName: string;
  toId: string | number | undefined;
  toName: string;
  fromPos?: Position | null;
  at: string; // ISO
}

interface WavePayload extends WaveCommon { type: "wave"; }
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

// ------------------- Consts -------------------
const WAVE_EVENT = "wave:event";
const WAVE_ACK_EVENT = "wave:ack";
const WAVE_GO_EVENT = "wave:go";
const FEED_KEY = "wave:publicFeed";
const FEED_MAX = 30;
const FEED_POPUP_ID = "wave-feed";
const INCOMING_POPUP_ID = "wave-incoming";

// ------------------- Utils -------------------
function nowIso(): string { return new Date().toISOString(); }
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
  try { await (WA.state as any).saveVariable(FEED_KEY, trimmed); }
  catch { localStorage.setItem(FEED_KEY, JSON.stringify(trimmed)); }
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
  try { if ((WA.player as any)?.getPosition) return await (WA.player as any).getPosition(); }
  catch {}
  return null;
}
async function listPlayersSafe(): Promise<any[]> {
  try {
    if ((WA.players as any)?.list) {
      const it = await (WA.players as any).list();
      return Array.from(it as IterableIterator<any>);
    }
  } catch {}
  return [];
}
async function findPlayerByName(name: string): Promise<any | null> {
  const players = await listPlayersSafe();
  const p = players.find((pl: any) => (pl.name || "").trim() === name.trim());
  return p || null;
}

// ------------------- Feed popup (optional) -------------------
let feedPopupOpen = false;
let feedPopupHandle: any | null = null;

async function renderFeedPopup(): Promise<void> {
  const feed = await loadFeed();
  const lines = feed.map((e) => {
    if (e.type === "wave") return `🕒 ${timeAgo(e.at)}: ${e.fromName} 👋 → ${e.toName}`;
    if (e.type === "wave-ack") return `🕒 ${timeAgo((e as WaveAckPayload).ackAt)}: ${(e as WaveAckPayload).ackByName} رد 👋 لـ ${e.fromName}`;
    if (e.type === "wave-go") return `🕒 ${timeAgo((e as WaveGoPayload).goAt)}: ${(e as WaveGoPayload).goByName} رايح لـ ${e.fromName} 🚶`;
    return `🕒 حدث Wave`;
  }).join("\n");

  if (!feedPopupOpen) return;
  feedPopupHandle = (WA.ui as any).openPopup(
    FEED_POPUP_ID,
    `Wave Feed ( للجميع )\n\n${lines || "لا أحداث بعد"}`,
    [{ label: "إغلاق", callback: () => { feedPopupOpen = false; try { feedPopupHandle?.close(); } catch {} } },
     { label: "تحديث", callback: () => renderFeedPopup() }]
  );
}
function openFeed(): void { feedPopupOpen = true; renderFeedPopup(); }
setInterval(() => { if (feedPopupOpen) renderFeedPopup(); }, 60_000);
(WA.state as any)?.onVariableChange?.(FEED_KEY)?.subscribe?.(() => { if (feedPopupOpen) renderFeedPopup(); });

// ------------------- Core actions -------------------
async function sendWaveTo(target: any): Promise<void> {
  const me = await getSelf();
  const myPos = await getPositionSafe();
  const payload: WavePayload = {
    type: "wave",
    fromId: me.id, fromName: me.name,
    toId: target.id, toName: target.name || "مجهول",
    fromPos: myPos || undefined,
    at: nowIso()
  };
  (WA.event as any).broadcast(WAVE_EVENT, payload);
  await pushToFeed(payload);
  try { (WA.chat as any)?.sendChatMessage?.(`👋 ${me.name} نادى على ${payload.toName}`, "WaveBot"); } catch {}
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
          const ack: WaveAckPayload = { ...data, type: "wave-ack", ackById: me.id, ackByName: me.name, ackAt: nowIso() };
          (WA.event as any).broadcast(WAVE_ACK_EVENT, ack);
          await pushToFeed(ack);
          try { incomingPopupHandle?.close?.(); } catch {}
        }
      },
      {
        label: "جاي لك 🚶",
        callback: async () => {
          const me = await getSelf();
          const go: WaveGoPayload = { ...data, type: "wave-go", goById: me.id, goByName: me.name, goAt: nowIso() };
          (WA.event as any).broadcast(WAVE_GO_EVENT, go);
          await pushToFeed(go);

          const targetPos = data.fromPos;
          try {
            if (targetPos) {
              if ((WA.player as any)?.teleport) (WA.player as any).teleport(targetPos.x, targetPos.y);
              else if ((WA.player as any)?.moveTo) (WA.player as any).moveTo(targetPos.x, targetPos.y);
              else if ((WA.camera as any)?.set) {
                (WA.camera as any).set(targetPos.x, targetPos.y);
                (WA.ui as any).displayActionMessage({ message: "تم تحديد المكان 🔖", callback: () => {} });
              } else {
                (WA.ui as any).displayActionMessage({ message: "اتّبع الخريطة يدويًا", callback: () => {} });
              }
            }
          } catch (e) { console.warn("Go failed", e); }
          try { incomingPopupHandle?.close?.(); } catch {}
        }
      },
      { label: "إغلاق", callback: () => { try { incomingPopupHandle?.close?.(); } catch {} } }
    ]
  );
}

// ------------------- Events (broadcast) -------------------
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

// ------------------- Inject "Wave" button in player card -------------------
/**
 * بنستخدم MutationObserver نراقب ظهور كارت اللاعب (اللي فيه "Talk To")
 * ونحقن زر "Wave" جنبه. بنستخرج اسم اللاعب من عنوان الكارت ونلاقيه في قائمة اللاعبين.
 */
function injectWaveButtonWhenPlayerCardAppears() {
  const observer = new MutationObserver(async () => {
    // نحاول نلاقي عنصر الكارت: زر Talk To + اسم اللاعب
    // selectors مرنة قدر الإمكان
    const talkBtn = Array.from(document.querySelectorAll('button, a'))
      .find((el: any) => /talk to/i.test((el.textContent || '').trim()));
    if (!talkBtn) return;

    // نبحث عن اسم اللاعب في نفس الكارت (عادة heading أو strong)
    const card = talkBtn.closest('div,section,dialog') as HTMLElement | null;
    if (!card) return;

    let nameEl = card.querySelector('h1,h2,h3,strong,div');
    // fallback: لو مفيش heading واضح، ناخد أول عنصر نصي غير الزراير
    if (!nameEl) {
      nameEl = Array.from(card.children).find((c: any) => {
        const t = (c.textContent || '').trim();
        return t && !/talk to|block/i.test(t);
      }) as Element | undefined || null;
    }
    const playerName = (nameEl?.textContent || '').trim();
    if (!playerName) return;

    // لو الزرار متحقن بالفعل، بلاش نكرّره
    if (card.querySelector('.wa-wave-btn')) return;

    // نضيف زر Wave بنفس ستايل الأزرار تقريبًا
    const waveBtn = document.createElement('button');
    waveBtn.className = 'wa-wave-btn';
    waveBtn.textContent = '👋 Wave';
    Object.assign(waveBtn.style, {
      marginLeft: '8px',
      padding: '6px 10px',
      borderRadius: '6px',
      border: 'none',
      cursor: 'pointer'
    });

    // نحاول نحطه جنب Talk To مباشرة
    talkBtn.parentElement?.appendChild(waveBtn);

    waveBtn.addEventListener('click', async (ev) => {
      ev.preventDefault();
      try {
        const target = await findPlayerByName(playerName);
        if (!target) {
          (WA.ui as any).displayActionMessage({ message: `لا أقدر أحدد اللاعب: ${playerName}`, callback: () => {} });
          return;
        }
        await sendWaveTo(target);
      } catch (e) {
        console.warn('Wave click failed', e);
      }
    });
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

// ------------------- Optional menu to open feed -------------------
(WA.ui as any).registerMenuCommand?.("📜 Wave: Open Feed", () => openFeed());

// ------------------- Init -------------------
WA.onInit().then(() => {
  // فعل حقن الزرار في كارت اللاعب
  injectWaveButtonWhenPlayerCardAppears();

  // رسالة مساعدة أول مرة
  setTimeout(() => {
    (WA.ui as any).displayActionMessage({
      message: "اضغط على أي لاعب → هتلاقي زر 👋 Wave جنب Talk To. افتح الفيد من القائمة 📜.",
      callback: () => {}
    });
  }, 900);
});
