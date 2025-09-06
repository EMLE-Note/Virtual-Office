// test: مجرد نتحقق إن onEnterZone شغالة
export {};

WA.onInit().then(() => {
  console.log('[WaveTest] WA init OK');

  // جرّب API 1: onEnterZone (متاحة في إصدارات كتير)
  (WA.room as any)?.onEnterZone?.('wave-hud', () => {
    console.log('[WaveTest] onEnterZone fired');
    (WA.ui as any).displayActionMessage({
      message: 'دخلت زون wave-hud ✅ (SPACE ينفّذ الكول باك)',
      callback: async () => {
        (WA.ui as any).openPopup('z', 'الزون شغّالة ✅', [{ label: 'تمام', callback: async () => {} }]);
      }
    });
  });

  // احتياط: في بعض الإصدارات اسمها onEnterLayer وبتاخد اسم اللير
  (WA.room as any)?.onEnterLayer?.('wave-hud', () => {
    console.log('[WaveTest] onEnterLayer fired');
    (WA.ui as any).displayActionMessage({
      message: 'دخلت Layer اسمها wave-hud ✅',
      callback: async () => {}
    });
  });

  // تيست دائم يطمن إن السكربت شغّال أصلاً
  setTimeout(() => {
    (WA.ui as any).displayActionMessage({
      message: 'WaveTest loaded. امشي لحد الزون.',
      callback: async () => {}
    });
  }, 600);
});
