// src/features/heartbeat.ts
import type { WorkAdventureApi } from "@workadventure/iframe-api-typings";

const WEBHOOK = 'https://n8n.emlenotes.com/webhook/heartbeat'; // ✏️ عدّل
const API_KEY: string | null = '';  // ✏️ أو خليه null لو مش عايزه

const HEARTBEAT_MS = 0.1 * 60 * 1000; // 5 دقايق
const GAP_MS = 10 * 60 * 1000;      // 10 دقايق

const nowIso = () => new Date().toISOString();

function ensureAnonId(): string {
  const k = 'anon_id';
  let v = localStorage.getItem(k);
  if (!v) {
    // randomUUID متاحة بمعظم المتصفحات الحديثة
    v = (crypto && 'randomUUID' in crypto) ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
    localStorage.setItem(k, v);
  }
  return v;
}

function postJSON(data: unknown, beacon = false) {
  const body = JSON.stringify(data);

  if (beacon && 'sendBeacon' in navigator) {
    const blob = new Blob([body], { type: 'application/json' });
    return navigator.sendBeacon(WEBHOOK, blob);
  }

  // 👇 بناء الهيدرز كـ Record<string,string> لتفادي TS2322
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (API_KEY) headers['X-Api-Key'] = API_KEY;

  return fetch(WEBHOOK, {
    method: 'POST',
    headers,            // خلاص بقى نوعها متوافق مع HeadersInit
    body,
    keepalive: true,
  }).catch(console.error);
}

function makePayload(WA: WorkAdventureApi, action: 'ping') {
  const player = WA.player;
  const room = WA.room;
  const roomId = room.id;

  return {
    action,
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
      // ❌ worldURL غير متوفرة في الـ typings — تم حذفها لتفادي TS2339
      // worldUrl: (room as any).worldURL ?? null,
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
  const first = makePayload(WA, 'ping');
  postJSON(first);
  localStorage.setItem(`lastSent:${roomId}`, first.sentAt);

  // Loop كل 5 دقايق
  setInterval(() => {
    const last = localStorage.getItem(`lastSent:${roomId}`);
    if (!last || Date.now() - Date.parse(last) > GAP_MS) {
      localStorage.setItem(`sessionStart:${roomId}`, nowIso());
    }
    const payload = makePayload(WA, 'ping');
    postJSON(payload);
    localStorage.setItem(`lastSent:${roomId}`, payload.sentAt);
  }, HEARTBEAT_MS);

  // قبل الإغلاق — beacon
  window.addEventListener('beforeunload', () => {
    const payload = makePayload(WA, 'ping');
    postJSON(payload, true);
  });
}
