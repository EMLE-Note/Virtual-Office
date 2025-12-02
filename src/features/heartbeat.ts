// src/features/heartbeat.ts
import type { WorkAdventureApi } from "@workadventure/iframe-api-typings";

// رابط الويب هوك الخاص بك
const WEBHOOK = 'https://n8n.emlenotes.com/webhook/heartbeat';

const HEARTBEAT_MS = 1 * 60 * 1000;   // 1 دقيقة
const GAP_MS = 10 * 60 * 1000;        // 10 دقائق

const nowIso = () => new Date().toISOString();

// ========================================================
// 🛠️ متغيرات الذاكرة (In-Memory Storage)
// ========================================================
let _memAnonId: string | null = null;
let _memSessionStart: string | null = null;
let _memLastSent: string | null = null;

function ensureAnonId(): string {
  if (!_memAnonId) {
    _memAnonId = (crypto && 'randomUUID' in crypto) 
      ? crypto.randomUUID() 
      : `${Date.now()}-${Math.random()}`;
  }
  return _memAnonId;
}

// ========================================================
// 🛠️ دالة الإرسال
// ========================================================
async function postJSON(bodyText: string, beacon = false): Promise<void> {
  if (beacon && 'sendBeacon' in navigator) {
    navigator.sendBeacon(WEBHOOK, new Blob([bodyText], { type: 'text/plain;charset=UTF-8' }));
    return;
  }

  try {
    await fetch(WEBHOOK, {
      method: 'POST',
      mode: 'no-cors', 
      headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
      body: bodyText,
      keepalive: true,
    });
    console.log('➡️ heartbeat sent');
  } catch (err) {
    console.error('🚫 fetch error:', err);
  }
}

function makePayload(WA: WorkAdventureApi) {
  const player = WA.player;
  const room = WA.room;

  if (!_memSessionStart) {
    _memSessionStart = nowIso();
  }

  return {
    action: 'ping',
    sentAt: nowIso(),
    session: {
      startAt: _memSessionStart,
      gapMs: GAP_MS,
    },
    player: {
      id: player.id ?? ensureAnonId(),
      name: player.name,
      language: player.language,
      tags: player.tags,
    },
    room: {
      id: room.id,
      mapUrl: room.mapURL,
      pageUrl: window.location.href,
    },
  };
}

export async function startHeartbeat(WA: WorkAdventureApi) {
  await WA.onInit();

  const now = Date.now();
  if (_memLastSent && (now - Date.parse(_memLastSent) > GAP_MS)) {
    _memSessionStart = nowIso();
  }

  // إرسال أول نبضة (Ping)
  const first = makePayload(WA);
  await postJSON(JSON.stringify(first));
  _memLastSent = first.sentAt;

  // تكرار الإرسال كل فترة زمنية
  setInterval(async () => {
    const loopNow = Date.now();
    if (_memLastSent && (loopNow - Date.parse(_memLastSent) > GAP_MS)) {
       _memSessionStart = nowIso();
    }
    
    const payload = makePayload(WA);
    await postJSON(JSON.stringify(payload));
    
    _memLastSent = payload.sentAt;
  }, HEARTBEAT_MS);

  window.addEventListener('beforeunload', () => {
    const payload = makePayload(WA);
    postJSON(JSON.stringify(payload), true);
  });
}

// ========================================================
// 🛑 نقطة البداية (Entry Point) - تم التعديل هنا لمنع التكرار
// ========================================================
declare const WA: any;

// تعريف خاصية جديدة في النافذة (Window) لتعمل كقفل عالمي
declare global {
    interface Window {
        _heartbeatRunning: boolean;
    }
}

if (typeof WA !== 'undefined') {
    // 1. هل السكربت يعمل بالفعل في هذه الصفحة؟
    if (window._heartbeatRunning === true) {
        console.warn('⚠️ Heartbeat script is already running. Skipping duplicate execution.');
    } else {
        // 2. إذا لم يكن يعمل، ضع العلامة فوراً لمنع أي نسخة أخرى
        window._heartbeatRunning = true;
        console.log('✅ Starting Heartbeat Script...');

        startHeartbeat(WA).catch((err) => {
            console.error('❌ Heartbeat script failed:', err);
            // ملاحظة: لا نزيل العلامة هنا لتجنب إعادة المحاولة التي قد تسبب تكراراً
        });
    }
}