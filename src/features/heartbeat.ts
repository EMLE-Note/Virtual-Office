// src/features/heartbeat.ts
import type { WorkAdventureApi } from "@workadventure/iframe-api-typings";

const WEBHOOK = 'https://n8n.emlenotes.com/webhook-test/heartbeat';
const HEARTBEAT_MS = 5 * 60 * 1000;   // 5 دقائق
const GAP_MS = 10 * 60 * 1000;        // 10 دقائق

// ========================================================
// 🧠 الذاكرة المؤقتة (فكرتك - الحل السريع)
// ========================================================
const memoryStore: Record<string, string> = {};

// ========================================================
// 🛡️ المخزن الذكي (SafeStorage)
// يحاول التخزين الدائم، وإذا فشل يستخدم الذاكرة المؤقتة
// ========================================================
const safeStorage = {
    getItem: (key: string): string | null => {
        try {
            // محاولة القراءة من المتصفح
            return localStorage.getItem(key);
        } catch (e) {
            // إذا فشل (iframe block)، نقرأ من المتغيرات
            return memoryStore[key] || null;
        }
    },
    setItem: (key: string, value: string): void => {
        try {
            // محاولة الحفظ في المتصفح
            localStorage.setItem(key, value);
        } catch (e) {
            // إذا فشل، نحفظ في المتغيرات
            memoryStore[key] = value;
        }
    }
};

const nowIso = () => new Date().toISOString();

// ========================================================
// 📡 دالة الإرسال
// ========================================================
async function postJSON(bodyText: string, beacon = false): Promise<void> {
  // Beacon مفيد عند إغلاق الصفحة
  if (beacon && 'sendBeacon' in navigator) {
    navigator.sendBeacon(WEBHOOK, new Blob([bodyText], { type: 'text/plain;charset=UTF-8' }));
    return;
  }

  try {
    await fetch(WEBHOOK, {
      method: 'POST',
      mode: 'no-cors',  // لتجاوز مشاكل الـ CORS
      headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
      body: bodyText,
      keepalive: true,
    });
    console.log('✅ Pulse sent.');
  } catch (err) {
    console.error('🚫 Pulse failed:', err);
  }
}

// تجهيز البيانات
function makePayload(WA: WorkAdventureApi) {
  const player = WA.player;
  const room = WA.room;

  // استخدام المخزن الذكي لجلب وقت بداية الجلسة
  let sessionStart = safeStorage.getItem('wa_session_start');
  if (!sessionStart) {
      sessionStart = nowIso();
      safeStorage.setItem('wa_session_start', sessionStart);
  }

  return {
    action: 'ping',
    sentAt: nowIso(),
    session: {
      startAt: sessionStart,
      gapMs: GAP_MS,
    },
    player: {
      id: player.id, // WorkAdventure عادة يعطي ID ثابت
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

  const runHeartbeat = async () => {
    // التحقق من "الخنق" (Throttling) باستخدام الذاكرة الذكية
    // لمنع إرسال نبضات متكررة جداً من نفس المتصفح
    const lastSentStr = safeStorage.getItem('wa_last_sent_ts');
    const now = Date.now();
    
    if (lastSentStr) {
        const lastSent = parseInt(lastSentStr, 10);
        // إذا لم تمر 55 ثانية، لا ترسل شيئاً
        if (now - lastSent < 55000) {
            return; 
        }
    }

    const payload = makePayload(WA);
    
    // تحديث وقت آخر إرسال قبل عملية الـ Fetch
    safeStorage.setItem('wa_last_sent_ts', now.toString());

    await postJSON(JSON.stringify(payload));
  };

  // تشغيل فوري
  await runHeartbeat();

  // جدولة التكرار
  setInterval(runHeartbeat, HEARTBEAT_MS);

  // عند الإغلاق
  window.addEventListener('beforeunload', () => {
    const payload = makePayload(WA);
    postJSON(JSON.stringify(payload), true);
  });
}

// ========================================================
// 🛑 منع التشغيل المزدوج (Global Lock)
// هذا أهم جزء لمنع السكربت من العمل مرتين في نفس الصفحة
// ========================================================
declare const WA: any;
declare global { interface Window { _hbRunning: boolean; } }

if (typeof WA !== 'undefined') {
    // فحص متغير جافا سكريبت عادي في الذاكرة
    if (window._hbRunning) {
        console.warn('⚠️ Heartbeat loop already active. Skipping.');
    } else {
        window._hbRunning = true; // وضع القفل
        startHeartbeat(WA).catch((err) => {
            console.error('❌ Error starting heartbeat:', err);
        });
    }
}
