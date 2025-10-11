// إذا لم تكن أنواع WorkAdventure متاحة تلقائيًا، قد تحتاج إلى هذا الاستيراد
// import { ActionMessage } from "@workadventure/iframe-api-typings";
// (اعتمادًا على إعدادات مشروعك، قد لا تحتاج إلى هذا السطر)

// Array of desk configurations for easy expansion
const deskConfigurations = [
    { areaName: 'desk1', messageText: 'Welcome to mohmed desk' },
];

/**
 * يقوم بتهيئة المناطق التي تعرض رسائل ترحيب عند الدخول.
 * @param areaName - اسم الـ class للمنطقة في Tiled.
 * @param messageText - نص الرسالة الذي سيظهر.
 */
export function setupWelcomeArea(areaName: string, messageText: string): void {
    
    // تعريف نوع المتغير ليكون من نوع الرسالة الإجرائية أو غير مُعرف (undefined)
    let actionMessage: any | undefined; 
    // ملاحظة: إذا قمت باستيراد ActionMessage، يجب استخدامها: let actionMessage: ActionMessage | undefined;

    // عند دخول اللاعب إلى المنطقة المحددة
    WA.room.area.onEnter(areaName).subscribe(() => {
        
        // عرض الرسالة الإجرائية
        actionMessage = WA.ui.displayActionMessage({
            type: "message",
            message: messageText,
            
            callback: () => {
                console.log(`تم تفعيل رسالة الترحيب في منطقة "${areaName}".`);
            }
        });
    });

    // عند مغادرة اللاعب للمنطقة المحددة
    WA.room.area.onLeave(areaName).subscribe(() => {
        // نتحقق من وجود الرسالة قبل محاولة إزالتها
        if (actionMessage) {
            actionMessage.remove(); 
            actionMessage = undefined;
        }
    });
}

/**
 * Initializes all welcome areas based on the desk configurations array
 */
export function setupAllWelcomeAreas(): void {
    deskConfigurations.forEach(config => {
        setupWelcomeArea(config.areaName, config.messageText);
    });
}