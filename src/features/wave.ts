// ======================= Wave Feature (No Backend) =======================
// يعمل بالكامل عبر WorkAdventure Scripting API + WA.state
// الميزات: 👋 Wave / رد 👋 / "جاي لك" / وقت نسبي / فيد عام يراه الجميع

// ===== إعدادات عامة =====
const WAVE_EVENT = "wave:event";
const WAVE_ACK_EVENT = "wave:ack";
const WAVE_GO_EVENT = "wave:go";
const FEED_KEY = "wave:publicFeed";       // مصفوفة من الأحداث المشتركة بين اللاعبين
const FEED_MAX = 30;                       // احتفظ بآخر 30 حدث
const FEED_POPUP_ID = "wave-feed";
const INCOMING_POPUP_ID = "wave-incoming";
const HELP_ZONE_NAME = "wave-hud";         // اختياري: اعمل Zone بهذا الاسم لو عايز Hint

// ===== أدوات وقت نسبي =====
function nowIso() { return new Date().toISOString(); }
function timeAgo(tsIso) {
  const diff = Date.now() - Date.parse(tsIso || Date.now());
  const s = Math.max(1, Math.floor(diff / 1000));
  if (s < 60) return `${s} ثانية`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} دقيقة`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} ساعة`;
  const d = Math.floor(h / 24);
  return `${d} يوم`;
}

// ===== حفظ/قراءة الفيد =====
async function loadFeed() {
  try {
    return (await WA.state.loadVariable(FEED_KEY)) || [];
  } catch {
    return JSON.parse(localStorage.getItem(FEED_KEY) || "[]");
  }
}
async function saveFeed(arr) {
  const trimmed = arr.slice(-FEED_MAX);
  try {
    await WA.state.saveVariable(FEED_KEY, trimmed);
  } catch {
    localStorage.setItem(FEED_KEY, JSON.stringify(trimmed));
  }
}
async function pushToFeed(entry) {
  const feed = await loadFeed();
  feed.push(entry);
  await saveFeed(feed);
}

// ===== مساعدات لاعبين =====
async function getSelf() {
  return { id: WA.player?.id, name: WA.player?.name || "مجهول" };
}
async function getPositionSafe() {
  try {
    if (WA.player?.getPosition) return await WA.player.getPosition();
  } catch {}
  return null;
}
async function listPlayersSafe() {
  try {
    if (WA.players?.list) return await WA.players.list();
  } catch {}
  return [];
}
async function nearestPlayer() {
  const me = await getSelf();
  const myPos = await getPositionSafe();
  const players = (await listPlayersSafe()).filter(p => p.id !== me.id);
  if (!players.length) return null;
  if (!myPos || !players[0]?.position) return players[0]; // أبسط اختيار
  // اختَر الأقرب:
  let best = players[0], bestD = Infinity;
  for (const p of players) {
    const dx = (p.position?.x ?? 0) - myPos.x;
    const dy = (p.position?.y ?? 0) - myPos.y;
    const d = dx*dx + dy*dy;
    if (d < bestD) { bestD = d; best = p; }
  }
  return best;
}

// ===== واجهة الفيد العام =====
let feedPopupOpen = false;
async function renderFeedPopup() {
  const feed = await loadFeed();
  const lines = feed.map(e => {
    if (e.type === "wave")
      return `🕒 ${timeAgo(e.at)}: ${e.fromName} 👋 → ${e.toName}`;
    if (e.type === "wave-ack")
      return `🕒 ${timeAgo(e.ackAt)}: ${e.ackByName} رد 👋 لـ ${e.fromName}`;
    if (e.type === "wave-go")
      return `🕒 ${timeAgo(e.goAt)}: ${e.goByName} رايح لـ ${e.fromName} 🚶`;
    return `🕒 ${timeAgo(e.at || e.ackAt || e.goAt)}: حدث Wave`;
  }).join("\n");

  if (!feedPopupOpen) return;
  WA.ui.openPopup(
    FEED_POPUP_ID,
    `Wave Feed (يظهر للجميع)\n\n${lines || "لا أحداث بعد"}`,
    [
      { label: "إغلاق", callback: () => { feedPopupOpen = false; WA.ui.closePopup(); } },
      { label: "تحديث", callback: () => renderFeedPopup() },
    ]
  );
}
function openFeed() {
  feedPopupOpen = true;
  renderFeedPopup();
}

// حدّث الفيد تلقائيًا كل دقيقة لو مفتوح
setInterval(() => { if (feedPopupOpen) renderFeedPopup(); }, 60_000);

// استمع لتغيرات المتغير المشترك (لو مدعوم) وأعد الرسم
WA?.state?.onVariableChange?.(FEED_KEY)?.subscribe(() => { if (feedPopupOpen) renderFeedPopup(); });

// ===== واجهة مساعدة سريعة =====
function showHelpToast() {
  WA.ui.displayActionMessage?.({
    message: "اضغط W لإرسال 👋 لأقرب لاعب — اضغط F لفتح Wave Feed",
  });
}

// ===== إرسال Wave =====
async function sendWaveTo(target) {
  const me = await getSelf();
  const myPos = await getPositionSafe();
  const payload = {
    type: "wave",
    fromId: me.id, fromName: me.name,
    toId: target.id, toName: target.name || "مجهول",
    fromPos: myPos, at: nowIso()
  };
  // أذاعه للجميع
  WA.event.broadcast(WAVE_EVENT, payload);
  // أضِف للفيد
  await pushToFeed(payload);
  // إعلان خفيف في الشات العام (اختياري)
  try { WA.chat?.sendChatMessage?.(`👋 ${me.name} نادى على ${payload.toName}`, "WaveBot"); } catch {}
}

// ===== توست الويف الوارد للمستلم =====
function showIncomingWaveToast(data) {
  // لو فيه Popup مفتوح بنفس الـID اقفله عشان نعيد فتحه
  try { WA.ui.closePopup(); } catch {}
  WA.ui.openPopup(
    INCOMING_POPUP_ID,
    `👋 ${data.fromName} نادى عليك — (${timeAgo(data.at)})`,
    [
      {
        label: "رد 👋",
        callback: async () => {
          const me = await getSelf();
          const ack = {
            ...data,
            type: "wave-ack",
            ackById: me.id,
            ackByName: me.name,
            ackAt: nowIso()
          };
          WA.event.broadcast(WAVE_ACK_EVENT, ack);
          await pushToFeed(ack);
          WA.ui.closePopup();
        }
      },
      {
        label: "جاي لك 🚶",
        callback: async () => {
          const me = await getSelf();
          const go = {
            ...data,
            type: "wave-go",
            goById: me.id,
            goByName: me.name,
            goAt: nowIso()
          };
          WA.event.broadcast(WAVE_GO_EVENT, go);
          await pushToFeed(go);

          // محاولة نقل/تحريك/إشارة للمكان
          const targetPos = data.fromPos;
          try {
            if (targetPos) {
              if (WA.player?.teleport) {
                WA.player.teleport(targetPos.x, targetPos.y);
              } else if (WA.player?.moveTo) {
                WA.player.moveTo(targetPos.x, targetPos.y);
              } else if (WA.camera?.set) {
                WA.camera.set(targetPos.x, targetPos.y);
                WA.ui.displayActionMessage?.({ message: "تم تحديد مكانه على الخريطة 🔖" });
              } else {
                WA.ui.displayActionMessage?.({ message: "تعذّر التحريك—اتّبع الخريطة يدويًا" });
              }
            }
          } catch (e) { console.warn("Go failed", e); }
          WA.ui.closePopup();
        }
      },
      { label: "إغلاق", callback: () => WA.ui.closePopup() }
    ]
  );
}

// ===== مستمعو الأحداث للجميع =====
WA.event.on(WAVE_EVENT).subscribe(async (data) => {
  // سجّل الحدث في الفيد العام (حتى لو مش أنا الهدف)
  await pushToFeed(data);

  // لو أنا الهدف—اظهر التوست التفاعلي
  if (data.toId === WA.player?.id) showIncomingWaveToast(data);
});

WA.event.on(WAVE_ACK_EVENT).subscribe(async (data) => {
  await pushToFeed(data);
  // إشعار سريع للجميع
  WA.ui.displayActionMessage?.({
    message: `👋 ${data.ackByName} رد على Wave من ${data.fromName} — (${timeAgo(data.ackAt)})`
  });
});

WA.event.on(WAVE_GO_EVENT).subscribe(async (data) => {
  await pushToFeed(data);
  WA.ui.displayActionMessage?.({
    message: `🚶 ${data.goByName} رايح لـ ${data.fromName} — (${timeAgo(data.goAt)})`
  });
});

// ===== اختصارات لوحة المفاتيح =====
// W: أرسل Wave لأقرب لاعب
WA.controls?.onKeyDown?.('KeyW')?.subscribe(async () => {
  const target = await nearestPlayer();
  if (!target) {
    WA.ui.openPopup("wave-none", "لا يوجد لاعبون بالقرب لإرسال Wave.", [{ label: "حسنا", callback: () => WA.ui.closePopup() }]);
    return;
  }
  await sendWaveTo(target);
});

// F: افتح الفيد العام
WA.controls?.onKeyDown?.('KeyF')?.subscribe(() => openFeed());

// ===== هِنت عند دخول منطقة (اختياري) =====
WA?.ui?.onEnterZone?.(HELP_ZONE_NAME, () => showHelpToast());

// ===== تلميح مبدئي بعد init =====
WA.onInit().then(() => {
  // رسالة بداية لطيفة (مرة واحدة)
  setTimeout(() => {
    WA.ui.displayActionMessage?.({
      message: "👋 Wave جاهز: W للإرسال — F لعرض الـFeed"
    });
  }, 800);
});
