import type { WorkAdventureApi } from "@workadventure/iframe-api-typings";

const WEBHOOK = 'https://n8n.emlenotes.com/webhook-test/heartbeat';
const HEARTBEAT_MS = 1 * 60 * 1000;   // 1 دقيقة
const STORAGE_KEY = 'wa_last_heartbeat_sent'; // مفتاح التخزين المشترك

const nowIso = () => new Date().toISOString();

async function postJSON(bodyText: string): Promise<void> {
    try {
        await fetch(WEBHOOK, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
            body: bodyText,
            keepalive: true,
        });
        console.log('➡️ Heartbeat sent via Network');
    } catch (err) {
        console.error('🚫 Fetch error:', err);
    }
}

// دالة ذكية للتحقق: هل يحق لنا الإرسال الآن؟
function shouldSendHeartbeat(): boolean {
    const lastSentStr = localStorage.getItem(STORAGE_KEY);
    if (!lastSentStr) return true; // لم يرسل أبداً

    const lastSentTime = parseInt(lastSentStr, 10);
    const now = Date.now();

    // نتحقق: هل مرت 55 ثانية على الأقل منذ آخر إرسال (من أي تبويب)؟
    // جعلناها 55 ثانية بدلاً من 60 لنتجنب مشاكل التزامن البسيطة
    if (now - lastSentTime < 55000) {
        console.log('⏳ Skipped: Heartbeat sent recently by another tab/script.');
        return false;
    }
    return true;
}

function updateLastSent() {
    localStorage.setItem(STORAGE_KEY, Date.now().toString());
}

function makePayload(WA: WorkAdventureApi) {
    const player = WA.player;
    const room = WA.room;
    
    // نستخدم وقت بداية الجلسة من التخزين أيضاً لتوحيده
    let sessionStart = localStorage.getItem('wa_session_start');
    if (!sessionStart) {
        sessionStart = nowIso();
        localStorage.setItem('wa_session_start', sessionStart);
    }

    return {
        action: 'ping',
        sentAt: nowIso(),
        session: { startAt: sessionStart, gapMs: 10 * 60 * 1000 },
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
    await WA.onInit();

    // 1. الدالة الرئيسية التي تنفذ الإرسال
    const runHeartbeat = async () => {
        if (!shouldSendHeartbeat()) return; // توقف إذا أرسل تبويب آخر مؤخراً

        const payload = makePayload(WA);
        
        // تحديث الوقت *قبل* الإرسال بقليل لمنع التبويبات الأخرى من السباق
        updateLastSent(); 
        
        await postJSON(JSON.stringify(payload));
    };

    // 2. تشغيل فوري (بشرط عدم وجود إرسال حديث)
    await runHeartbeat();

    // 3. التكرار
    setInterval(runHeartbeat, HEARTBEAT_MS);
}

// نقطة البداية
declare const WA: any;
if (typeof WA !== 'undefined') {
    startHeartbeat(WA).catch(console.error);
}
