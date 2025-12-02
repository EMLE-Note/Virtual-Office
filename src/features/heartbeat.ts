// src/features/heartbeat.ts
import type { WorkAdventureApi } from "@workadventure/iframe-api-typings";

const WEBHOOK = 'https://n8n.emlenotes.com/webhook/heartbeat';
// نرسل كل 55 ثانية لضمان عدم وجود فجوات، والفلترة ستكون في السيرفر
const HEARTBEAT_MS = 55 * 1000; 

async function postJSON(data: any) {
  try {
    // نستخدم keepalive لضمان الوصول حتى لو أغلقت الصفحة
    await fetch(WEBHOOK, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      keepalive: true,
    });
  } catch (e) { /* تجاهل الأخطاء */ }
}

export async function startHeartbeat(WA: WorkAdventureApi) {
  await WA.onInit();
  
  const sendPing = () => {
    postJSON({
      action: 'ping',
      player: { name: WA.player.name, id: WA.player.id },
      // نرسل الوقت الحالي لكي يقوم السيرفر بحساب البصمة
      sentAt: new Date().toISOString() 
    });
  };

  // إرسال فوري
  sendPing();
  // إرسال دوري
  setInterval(sendPing, HEARTBEAT_MS);
}

declare const WA: any;
// متغير عالمي بسيط لمنع التكرار في نفس الصفحة (بدون تخزين معقد)
if (typeof WA !== 'undefined' && !(window as any)._hbRunning) {
    (window as any)._hbRunning = true;
    startHeartbeat(WA);
}