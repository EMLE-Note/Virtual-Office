// src/features/wave_test.ts
// POC: يرصد فتح كارت اللاعب (Talk To) ويعرض Popup صغير فيه "Wave (test)"
export {};

const TEST_EVENT = "wave:test";
const TEST_POPUP_ID = "wave-test-popup";

// helpers
function nowIso() { return new Date().toISOString(); }
function timeAgo(tsIso: string) {
  const s = Math.max(1, Math.floor((Date.now() - Date.parse(tsIso)) / 1000));
  if (s < 60) return `${s} ثانية`;
  const m = Math.floor(s/60); if (m < 60) return `${m} دقيقة`;
  const h = Math.floor(m/60); if (h < 24) return `${h} ساعة`;
  const d = Math.floor(h/24); return `${d} يوم`;
}

// يطلع أقرب اسم لاعب من محتوى الكارت
function extractPlayerName(card: HTMLElement): string {
  const h = card.querySelector('h1,h2,h3,strong');
  if (h?.textContent?.trim()) return h.textContent.trim();
  const blocks = Array.from(card.querySelectorAll<HTMLElement>('div,span,p'));
  for (const b of blocks) {
    const t = (b.textContent || '').trim();
    if (!t) continue;
    if (/talk to|block/i.test(t)) continue;
    if (t.length <= 40) return t;
  }
  return '';
}

// نلاقي عنصر نصه “Talk To” (بحروف مختلفة)
function findTalkTo(root: ParentNode): HTMLElement | null {
  const all = Array.from(root.querySelectorAll<HTMLElement>('*'));
  return all.find(el => ((el.textContent || '').trim().toLowerCase() === 'talk to')) || null;
}

// يرصد ظهور كارت اللاعب — “الحدث” اللي طلبته بشكل عملي
function watchPlayerCardOpen() {
  const obs = new MutationObserver(() => {
    // أي Dialog/Panel جديد
    const cards = Array.from(document.querySelectorAll<HTMLElement>('div,section,dialog,[role="dialog"]'));
    for (const card of cards) {
      if (!card.isConnected) continue;
      // لازم يحتوي على Talk To
      const talk = findTalkTo(card);
      if (!talk) continue;

      // طلع الاسم
      const name = extractPlayerName(card);
      if (!name) continue;

      // افتح Popup تجريبي مرّة واحدة لكل فتح
      // (لو مفتوح بالفعل، بلاش نكرر)
      if ((card as any).__waveTestAttached) continue;
      (card as any).__waveTestAttached = true;

      const handle = (WA.ui as any).openPopup(
        TEST_POPUP_ID,
        `تجربة Wave مع: ${name}\n(POC)`,
        [
          {
            label: "👋 Wave (test)",
            callback: async () => {
              const meName = (WA.player as any)?.name || "مجهول";
              const payload = { type: "test", fromName: meName, toName: name, at: nowIso() };
              (WA.event as any).broadcast(TEST_EVENT, payload);
              try { (handle as any)?.close?.(); } catch {}
            }
          },
          { label: "إغلاق", callback: () => { try { (handle as any)?.close?.(); } catch {} } }
        ]
      );
    }
  });

  obs.observe(document.body, { childList: true, subtree: true });
}

// استقبال الحدث التجريبي وإظهار Toast للجميع
(WA.event as any).on(TEST_EVENT).subscribe((raw: any) => {
  const data = raw as { fromName: string; toName: string; at: string };
  (WA.ui as any).displayActionMessage({
    message: `✅ (Test) ${data.fromName} عمل Wave لـ ${data.toName} — ${timeAgo(data.at)}`,
    callback: () => {}
  });
});

WA.onInit().then(() => {
  watchPlayerCardOpen();
  setTimeout(() => {
    (WA.ui as any).displayActionMessage({
      message: "POC جاهز: اضغط على أي لاعب وافتح الكارت → هتشوف زر 👋 Wave (test).",
      callback: () => {}
    });
  }, 800);
});
