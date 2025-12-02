// src/features/heartbeat.ts
import type { WorkAdventureApi } from "@workadventure/iframe-api-typings";

const WEBHOOK = 'https://n8n.emlenotes.com/webhook/heartbeat';
const HEARTBEAT_MS = 1 * 60 * 1000;   // دقيقة واحدة
const GAP_MS = 10 * 60 * 1000;        // 10 دقائق

// ========================================================
// 🛡️ نظام التخزين الآمن (Safe Storage)
// هذا الجزء يمنع السكربت من الانهيار إذا كان LocalStorage محظوراً
// ========================================================
const safeStorage = {
    getItem: (key: string): string | null => {
        try {
            return localStorage.getItem(key);
        } catch (e) {
            console.warn('⚠️ LocalStorage is blocked, falling back to memory.');
            return null; 
        }
    },
    setItem: (key: string, value: string): void => {
        try {
            localStorage.setItem(key, value);
        } catch (e) {
            // تجاهل الخطأ بصمت للحفاظ على استقرار السكربت
        }
    }
};

// متغيرات ذاكرة احتياطية
let _memSessionStart: string | null = null;
let _memLastSentTime: number = 0;

const nowIso = () => new Date().toISOString();

// ========================================================
// 🚀 دالة الإرسال
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
    console.log('✅ Heartbeat sent successfully');
  } catch (err) {
    console.error('🚫 Fetch error:', err);
  }
}

function makePayload(WA: WorkAdventureApi) {
  const player = WA.player;
  const room = WA.room;

  // محاولة جلب بداية الجلسة من التخزين الآمن
  let sessionStart = safeStorage.getItem('wa_session_start');
  if (!sessionStart) {
      // إذا لم توجد، نستخدم المتغير المحلي أو ننشئ جديداً
      sessionStart = _memSessionStart || nowIso();
      safeStorage.setItem('wa_session_start', sessionStart);
      _memSessionStart = sessionStart;
  }

  return {
    action: 'ping',
    sentAt: nowIso(),
    session: {
      startAt: sessionStart,
      gapMs: GAP_MS,
    },
    player: {
      id: player.id,
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
  console.log('🔌 Heartbeat script initialized...'); // للتأكد أن السكربت بدأ
  await WA.onInit();

  const runHeartbeat = async () => {
    const now = Date.now();

    // 1. التحقق من التكرار عبر التخزين الآمن (لمنع التبويبات المتعددة)
    const lastGlobalSent = safeStorage.getItem('wa_last_heartbeat_ts');
    if (lastGlobalSent) {
        const timeDiff = now - parseInt(lastGlobalSent, 10);
        // إذا قام أي تبويب بالإرسال خلال الـ 55 ثانية الماضية، نتوقف
        if (timeDiff < 55000) {
            console.log('⏳ Skipped: Heartbeat handled by another tab recently.');
            return;
        }
    }

    // 2. التحقق من التكرار المحلي السريع (لمنع النبضات المزدوجة في نفس الصفحة)
    if (now - _memLastSentTime < 5000) {
        console.log('⏳ Skipped: Local debounce (too fast).');
        return;
    }

    // التنفيذ
    const payload = makePayload(WA);
    
    // تحديث الأختام الزمنية قبل الإرسال لمنع السباق
    safeStorage.setItem('wa_last_heartbeat_ts', now.toString());
    _memLastSentTime = now;

    await postJSON(JSON.stringify(payload));
  };

  // تشغيل فوري
  await runHeartbeat();

  // تكرار
  setInterval(runHeartbeat, HEARTBEAT_MS);

  // عند الإغلاق
  window.addEventListener('beforeunload', () => {
    const payload = makePayload(WA);
    postJSON(JSON.stringify(payload), true);
  });
}

// ========================================================
// نقطة البداية مع حماية التكرار
// ========================================================
declare const WA: any;

// تعريف عالمي لمنع تشغيل السكربت مرتين في نفس الصفحة
declare global { interface Window { _hbRunning: boolean; } }

if (typeof WA !== 'undefined') {
    if (window._hbRunning) {
        console.warn('⚠️ Heartbeat already running in this tab.');
    } else {
        window._hbRunning = true;
        startHeartbeat(WA).catch((err) => {
            console.error('❌ Heartbeat script crashed:', err);
        });
    }
}
