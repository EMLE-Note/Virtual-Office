// src/heartbeat.ts
import type { WorkAdventureApi } from "@workadventure/iframe-api-typings";

const WEBHOOK = 'https://n8n.emlenotes.com/webhook/7eab5dcd-b0bb-46ff-bf0d-8a712b5dbda5'; // ✏️ عدّل
const API_KEY = '';                  // ✏️ لو محتاج

const HEARTBEAT_MS = 0.5 * 60 * 1000;   // 5 دقايق
const GAP_MS = 10 * 60 * 1000;        // 10 دقايق

const nowIso = () => new Date().toISOString();

function postJSON(data: unknown, beacon = false) {
  const body = JSON.stringify(data);
  if (beacon && 'sendBeacon' in navigator) {
    const blob = new Blob([body], { type: 'application/json' });
    return navigator.sendBeacon(WEBHOOK, blob);
  }
  return fetch(WEBHOOK, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(API_KEY ? { 'X-Api-Key': API_KEY } : {})
    },
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
      id: player.id ?? localStorage.getItem('anon_id') ?? crypto.randomUUID(),
      name: player.name,
      language: player.language,
      tags: player.tags,
    },
    room: {
      id: room.id,
      mapUrl: room.mapURL,
      worldUrl: room.worldURL,
    }
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

  // Loop
  setInterval(() => {
    const last = localStorage.getItem(`lastSent:${roomId}`);
    if (!last || Date.now() - Date.parse(last) > GAP_MS) {
      localStorage.setItem(`sessionStart:${roomId}`, nowIso());
    }
    const payload = makePayload(WA, 'ping');
    postJSON(payload);
    localStorage.setItem(`lastSent:${roomId}`, payload.sentAt);
  }, HEARTBEAT_MS);

  // قبل الإغلاق
  window.addEventListener('beforeunload', () => {
    const payload = makePayload(WA, 'ping');
    postJSON(payload, true);
  });
}
