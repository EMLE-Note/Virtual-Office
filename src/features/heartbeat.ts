// src/features/heartbeat.ts
import type { WorkAdventureApi } from "@workadventure/iframe-api-typings";

// Production URL
const WEBHOOK = 'https://n8n.emlenotes.com/webhook/heartbeat';

const HEARTBEAT_MS = 10 * 1000;       // 10 ثواني (يمكنك تعديلها لنص دقيقة 30000)
const GAP_MS = 10 * 60 * 1000;        // 10 دقائق

const nowIso = () => new Date().toISOString();

function ensureAnonId(): string {
  const k = 'anon_id';
  let v = localStorage.getItem(k);
  if (!v) {
    v = (crypto && 'randomUUID' in crypto) ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
    localStorage.setItem(k, v);
  }
  return v;
}

// ❗️رجّع Promise<void> وتأكد كل المسارات بتنتهي بـ return
async function postJSON(bodyText: string, beacon = false): Promise<void> {
  if (beacon && 'sendBeacon' in navigator) {
    const ok = navigator.sendBeacon(WEBHOOK, new Blob([bodyText], { type: 'text/plain;charset=UTF-8' }));
    console.log('🔔 beacon sent?', ok);
    return;
  }

  try {
    const res = await fetch(WEBHOOK, {
      method: 'POST',
      // نستخدم text/plain لتفادي preflight CORS
      headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
      body: bodyText,
      keepalive: true,
    });
    console.log('➡️ heartbeat POST →', res.status, res.statusText);
    return;
  } catch (err) {
    console.error('🚫 fetch error:', err);
    return;
  }
}

function makePayload(WA: WorkAdventureApi) {
  const player = WA.player;
  const room = WA.room;
  const roomId = room.id;

  return {
    action: 'ping',
    sentAt: nowIso(),
    session: {
      startAt: localStorage.getItem(`sessionStart:${roomId}`) ?? nowIso(),
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

  const roomId = WA.room.id;
  const lastSent = localStorage.getItem(`lastSent:${roomId}`);
  const newSession = !lastSent || Date.now() - Date.parse(lastSent) > GAP_MS;
  if (newSession) {
    localStorage.setItem(`sessionStart:${roomId}`, nowIso());
  }

  // Ping أولي
  const first = makePayload(WA);
  await postJSON(JSON.stringify(first));
  localStorage.setItem(`lastSent:${roomId}`, first.sentAt);

  // Loop كل فترة
  setInterval(async () => {
    const last = localStorage.getItem(`lastSent:${roomId}`);
    if (!last || Date.now() - Date.parse(last) > GAP_MS) {
      localStorage.setItem(`sessionStart:${roomId}`, nowIso());
    }
    const payload = makePayload(WA);
    await postJSON(JSON.stringify(payload));
    localStorage.setItem(`lastSent:${roomId}`, payload.sentAt);
  }, HEARTBEAT_MS);

  // قبل الإغلاق
  window.addEventListener('beforeunload', () => {
    const payload = makePayload(WA);
    // sendBeacon لا يعمل مع await، فمش محتاجين ننتظر
    postJSON(JSON.stringify(payload), true);
  });
}

// ========================================================
// 🔥 الجزء المهم جداً لتشغيل الكود (Main Entry Point)
// ========================================================

// نخبر TypeScript أن المتغير WA موجود عالمياً (Global)
declare const WA: any;

// نتأكد أن الكود يعمل فقط داخل WorkAdventure وليس في بيئة أخرى
if (typeof WA !== 'undefined') {
    startHeartbeat(WA).catch((err) => {
        console.error('❌ Heartbeat script failed to start:', err);
    });
} else {
    console.warn('⚠️ WA object not found. Are you running inside WorkAdventure?');
}