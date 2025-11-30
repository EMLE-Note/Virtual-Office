// src/features/heartbeat.ts
import type { WorkAdventureApi } from "@workadventure/iframe-api-typings";

// رابط الويب هوك الخاص بك
const WEBHOOK = 'https://n8n.emlenotes.com/webhook/heartbeat';

const HEARTBEAT_MS = 9 * 60 * 1000; // 9 دقائق
const GAP_MS = 9 * 60 * 1000;       // 9 دقائق

const nowIso = () => new Date().toISOString();

// ========================================================
// 🛠️ التعديل الأول: متغيرات الذاكرة (In-Memory Storage)
// ========================================================
// نستخدم هذه المتغيرات بدلاً من localStorage لتخزين البيانات
// طالما اللاعب موجود في الخريطة، هذه المتغيرات ستحتفظ بقيمتها
let _memAnonId: string | null = null;
let _memSessionStart: string | null = null;
let _memLastSent: string | null = null;

function ensureAnonId(): string {
  if (!_memAnonId) {
    // نولد معرف عشوائي ونحفظه في المتغير بدلاً من التخزين المحلي
    _memAnonId = (crypto && 'randomUUID' in crypto) 
      ? crypto.randomUUID() 
      : `${Date.now()}-${Math.random()}`;
  }
  return _memAnonId;
}

// ========================================================
// 🛠️ التعديل الثاني: حل مشكلة الشبكة (no-cors)
// ========================================================
async function postJSON(bodyText: string, beacon = false): Promise<void> {
  // Beacon جيد عند إغلاق الصفحة
  if (beacon && 'sendBeacon' in navigator) {
    navigator.sendBeacon(WEBHOOK, new Blob([bodyText], { type: 'text/plain;charset=UTF-8' }));
    return;
  }

  try {
    await fetch(WEBHOOK, {
      method: 'POST',
      // 👇 هذا السطر هو الحل السحري لتجاوز حظر الشبكة في الـ Iframe
      mode: 'no-cors', 
      headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
      body: bodyText,
      keepalive: true,
    });
    // ملاحظة: في وضع no-cors لا يمكننا قراءة الـ status (تكون دائماً 0)
    console.log('➡️ heartbeat sent (in-memory mode)');
  } catch (err) {
    console.error('🚫 fetch error:', err);
  }
}

function makePayload(WA: WorkAdventureApi) {
  const player = WA.player;
  const room = WA.room;

  // منطق بداية الجلسة باستخدام المتغيرات
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

  // التحقق من حالة الجلسة عند التشغيل
  const now = Date.now();
  if (_memLastSent && (now - Date.parse(_memLastSent) > GAP_MS)) {
    // إذا مر وقت طويل، نعتبرها جلسة جديدة
    _memSessionStart = nowIso();
  }

  // إرسال أول نبضة (Ping)
  const first = makePayload(WA);
  await postJSON(JSON.stringify(first));
  _memLastSent = first.sentAt;

  // تكرار الإرسال كل فترة زمنية
  setInterval(async () => {
    const loopNow = Date.now();
    // التحقق مرة أخرى في كل لفة
    if (_memLastSent && (loopNow - Date.parse(_memLastSent) > GAP_MS)) {
       _memSessionStart = nowIso();
    }
    
    const payload = makePayload(WA);
    await postJSON(JSON.stringify(payload));
    
    // تحديث وقت آخر إرسال في المتغير
    _memLastSent = payload.sentAt;
  }, HEARTBEAT_MS);

  // عند إغلاق الصفحة
  window.addEventListener('beforeunload', () => {
    const payload = makePayload(WA);
    postJSON(JSON.stringify(payload), true);
  });
}

// ========================================================
// نقطة البداية (Entry Point)
// ========================================================
declare const WA: any;

if (typeof WA !== 'undefined') {
    startHeartbeat(WA).catch((err) => {
        console.error('❌ Heartbeat script failed:', err);
    });
}
