// src/features/wave.ts
// Wave feature (TypeScript, no backend) — "Wave" button next to "Talk To" card option
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

interface WaveTalkPayload extends WaveCommon {
  type: "wave-talk";
  talkById: string | number | undefined;
  talkByName: string;
  talkAt: string; // ISO
}

type FeedEntry = WavePayload | WaveAckPayload | WaveTalkPayload;

// ------------------- Consts -------------------
const WAVE_EVENT      = "wave:event";
const WAVE_ACK_EVENT  = "wave:ack";
const WAVE_TALK_EVENT = "wave:talk";
const FEED_KEY   = "wave:publicFeed";
const FEED_MAX   = 30;
const FEED_POPUP_ID    = "wave-feed";
const INCOMING_POPUP_ID = "wave-incoming";

// ------------------- Utils -------------------
const nowIso = () => new Date().toISOString();

function timeAgo(tsIso: string): string {
  const s = Math.max(1, Math.floor((Date.now() - Date.parse(tsIso || nowIso())) / 1000));
  if (s < 60) return `${s} ثانية`;
  const m = Math.floor(s/60); if (m < 60) return `${m} دقيقة`;
  const h = Math.floor(m/60); if (h < 24) return `${h} ساعة`;
  const d = Math.floor(h/24); return `${d} يوم`;
}

async function loadFeed(): Promise<FeedEntry[]> {
  try { return (await (WA.state as any).loadVariable(FEED_KEY)) ?? []; }
  catch { return JSON.parse(localStorage.getItem(FEED_KEY) || "[]") as FeedEntry[]; }
}
async function saveFeed(arr: FeedEntry[]) {
  const trimmed = arr.slice(-FEED_MAX);
  try { await (WA.state as any).saveVariable(FEED_KEY, trimmed); }
  catch { localStorage.setItem(FEED_KEY, JSON.stringify(trimmed)); }
}
async function pushToFeed(entry: FeedEntry) { const f = await loadFeed(); f.push(entry); await saveFeed(f); }

async function getSelf() { return { id: (WA.player as any)?.id as any, name: (WA.player as any)?.name || "مجهول" }; }
async function getPositionSafe(): Promise<Position | null> { try { if ((WA.player as any)?.getPosition) return await (WA.player as any).getPosition(); } catch {} return null; }

async function listPlayersSafe(): Promise<any[]> {
  try {
    if ((WA.players as any)?.list) {
      const it = await (WA.players as any).list();
      return Array.from(it as IterableIterator<any>); // Iterator → Array
    }
  } catch {}
  return [];
}

async function findPlayerByName(name: string): Promise<any | null> {
  const ps = await listPlayersSafe();
  return ps.find((p: any) => (p.name || '').trim() === name.trim()) || null;
}

// ------------------- Feed popup (optional) -------------------
let feedPopupOpen = false; let feedPopupHandle: any | null = null;

async function renderFeedPopup() {
  const feed = await loadFeed();
  const lines = feed.map(e => {
    if (e.type === "wave")     return `🕒 ${timeAgo(e.at)}: ${e.fromName} 👋 → ${e.toName}`;
    if (e.type === "wave-ack") return `🕒 ${timeAgo((e as WaveAckPayload).ackAt)}: ${(e as WaveAckPayload).ackByName} رد 👋 لـ ${e.fromName}`;
    if (e.type === "wave-talk")return `🕒 ${timeAgo((e as WaveTalkPayload).talkAt)}: ${(e as WaveTalkPayload).talkByName} عمل Talk To مع ${e.fromName} 🎤`;
    return `🕒 حدث Wave`;
  }).join("\n");

  if (!feedPopupOpen) return;
  feedPopupHandle = (WA.ui as any).openPopup(
    FEED_POPUP_ID,
    `Wave Feed (للجميع)\n\n${lines || "لا أحداث بعد"}`,
    [
      { label: "إغلاق",  callback: () => { feedPopupOpen = false; try { feedPopupHandle?.close(); } catch {} } },
      { label: "تحديث", callback: () => renderFeedPopup() }
    ]
  );
}
function openFeed() { feedPopupOpen = true; renderFeedPopup(); }
setInterval(() => { if (feedPopupOpen) renderFeedPopup(); }, 60_000);
(WA.state as any)?.onVariableChange?.(FEED_KEY)?.subscribe?.(() => { if (feedPopupOpen) renderFeedPopup(); });

// ------------------- Core Wave actions -------------------
async function sendWaveTo(target: any) {
  const me = await getSelf(); const myPos = await getPositionSafe();
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

function showIncomingWaveToast(data: WavePayload) {
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
        label: "Talk To",
        callback: async () => {
          const me = await getSelf();
          const talk: WaveTalkPayload = { ...data, type: "wave-talk", talkById: me.id, talkByName: me.name, talkAt: nowIso() };
          (WA.event as any).broadcast(WAVE_TALK_EVENT, talk);
          await pushToFeed(talk);

          // روح لمكان المرسل (نفس تأثير Talk To)
          const p = data.fromPos;
          try {
            if (p) {
              if ((WA.player as any)?.teleport) (WA.player as any).teleport(p.x, p.y);
              else if ((WA.player as any)?.moveTo) (WA.player as any).moveTo(p.x, p.y);
              else if ((WA.camera as any)?.set) { (WA.camera as any).set(p.x, p.y); (WA.ui as any).displayActionMessage({ message: "تم تحديد المكان 🔖", callback: () => {} }); }
              else (WA.ui as any).displayActionMessage({ message: "اتّبع الخريطة يدويًا", callback: () => {} });
            }
          } catch (e) { console.warn("TalkTo move failed", e); }
          try { incomingPopupHandle?.close?.(); } catch {}
        }
      },
      { label: "إغلاق", callback: () => { try { incomingPopupHandle?.close?.(); } catch {} } }
    ]
  );
}

// ------------------- Event listeners -------------------
(WA.event as any).on(WAVE_EVENT).subscribe((raw: any) => {
  const data = raw as WavePayload;
  pushToFeed(data);
  if (data.toId === (WA.player as any)?.id) showIncomingWaveToast(data);
});

(WA.event as any).on(WAVE_ACK_EVENT).subscribe((raw: any) => {
  const data = raw as WaveAckPayload;
  pushToFeed(data);
  (WA.ui as any).displayActionMessage({
    message: `👋 ${data.ackByName} رد على Wave من ${data.fromName} — (${timeAgo(data.ackAt)})`,
    callback: () => {}
  });
});

(WA.event as any).on(WAVE_TALK_EVENT).subscribe((raw: any) => {
  const data = raw as WaveTalkPayload;
  pushToFeed(data);
  (WA.ui as any).displayActionMessage({
    message: `🎤 ${data.talkByName} عمل Talk To مع ${data.fromName} — (${timeAgo(data.talkAt)})`,
    callback: () => {}
  });
});

// ------------------- DOM injection for "Wave" button -------------------
// Helpers
function textEquals(el: Element, text: string) {
  return (el.textContent || '').trim().toLowerCase() === text.trim().toLowerCase();
}
function findElementWithExactText(root: ParentNode, text: string): HTMLElement | null {
  const all = Array.from(root.querySelectorAll<HTMLElement>('*'));
  for (const el of all) {
    if (textEquals(el, text)) return el;
  }
  return null;
}
function findPlayerNameInCard(card: HTMLElement): string {
  const h = card.querySelector('h1,h2,h3,strong');
  if (h && (h.textContent || '').trim()) return (h.textContent || '').trim();
  const blocks = Array.from(card.querySelectorAll<HTMLElement>('div,span,p'));
  for (const b of blocks) {
    const t = (b.textContent || '').trim();
    if (!t) continue;
    if (/talk to|block/i.test(t)) continue;
    if (t.length <= 40) return t;
  }
  return '';
}

function injectWaveButtonWhenPlayerCardAppears() {
  // style للزر
  const style = document.createElement('style');
  style.textContent = `
    .wa-wave-btn { margin-left: 8px; padding: 6px 10px; border-radius: 6px; border: none; cursor: pointer; }
    .wa-wave-btn:hover { filter: brightness(1.08); }
  `;
  document.head.appendChild(style);

  const observer = new MutationObserver(() => {
    const candidates = Array.from(document.querySelectorAll<HTMLElement>('div,section,dialog,[role="dialog"]'));
    for (const card of candidates) {
      if (!card.isConnected) continue;

      // ابحث عن "Talk To" (Case-insensitive)
      const talkEl = findElementWithExactText(card, 'Talk To') || findElementWithExactText(card, 'Talk to');
      if (!talkEl) continue;

      const playerName = findPlayerNameInCard(card);
      if (!playerName) continue;

      if (card.querySelector('.wa-wave-btn')) continue;

      const waveBtn = document.createElement('button');
      waveBtn.className = 'wa-wave-btn';
      waveBtn.textContent = '👋 Wave';

      if (talkEl.parentElement) talkEl.parentElement.appendChild(waveBtn);
      else card.appendChild(waveBtn);

      waveBtn.addEventListener('click', async (ev) => {
        ev.preventDefault(); ev.stopPropagation();

        const target = await findPlayerByName(playerName);
        if (!target) {
          (WA.ui as any).displayActionMessage({ message: `لا أقدر أحدد اللاعب: ${playerName}`, callback: () => {} });
          return;
        }

        // نافذة اختيار: Send Wave أو Talk To
        const chooser = (WA.ui as any).openPopup(
          "wave-choose",
          `اختر الإجراء مع ${playerName}:`,
          [
            { label: "👋 Send Wave", callback: async () => { await sendWaveTo(target); try { (chooser as any)?.close?.(); } catch {} } },
            { label: "Talk To", callback: async () => {
                const me = await getSelf();
                // حاول تروح له فورًا (ميزة مشابهة لزر Talk To)
                const pos = (target.position || null) as Position | null;
                if (pos) {
                  try {
                    if ((WA.player as any)?.teleport) (WA.player as any).teleport(pos.x, pos.y);
                    else if ((WA.player as any)?.moveTo) (WA.player as any).moveTo(pos.x, pos.y);
                    else if ((WA.camera as any)?.set) { (WA.camera as any).set(pos.x, pos.y); (WA.ui as any).displayActionMessage({ message: "تم تحديد المكان 🔖", callback: () => {} }); }
                  } catch (e) { console.warn("TalkTo from card failed", e); }
                }
                // نذيع كمان في الفيد أنك عملت Talk To
                const evt: WaveTalkPayload = {
                  type: "wave-talk",
                  fromId: me.id, fromName: me.name,
                  toId: target.id, toName: target.name || "مجهول",
                  fromPos: pos || undefined,
                  at: nowIso(),
                  talkById: me.id, talkByName: me.name, talkAt: nowIso()
                };
                (WA.event as any).broadcast(WAVE_TALK_EVENT, evt);
                await pushToFeed(evt);
                try { (chooser as any)?.close?.(); } catch {}
              } },
            { label: "إلغاء", callback: () => { try { (chooser as any)?.close?.(); } catch {} } }
          ]
        );
      });
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

// ------------------- Optional menu (open feed) -------------------
(WA.ui as any).registerMenuCommand?.('📜 Wave: Open Feed', () => openFeed());

// ------------------- Init -------------------
WA.onInit().then(() => {
  injectWaveButtonWhenPlayerCardAppears();
  setTimeout(() => {
    (WA.ui as any).displayActionMessage({
      message: 'اضغط على أي لاعب → هتشوف زر 👋 Wave جنب "Talk To". افتح الفيد من القائمة 📜.',
      callback: () => {}
    });
  }, 900);
});
