const { sendMenu, waitingFor, autoWipe } = require('../utils/ui');
const { Markup } = require('telegraf');

const handleHelp = async (ctx) => {
    if (waitingFor.menuMessageId) {
        try { await ctx.telegram.deleteMessage(ctx.chat.id, waitingFor.menuMessageId); } catch(e){}
        waitingFor.menuMessageId = null;
    }
    
    const helpText = `📚 <b>CINEORA ASSISTANT V2 - TO'LIQ QO'LLANMA</b>\n\n` +
        `Bu bot kanalga video va posterlarni to'liq avtomatlashtirilgan, xavfsiz va konveyer uslubida joylash uchun maxsus yaratilgan.\n\n` +
        `<b>1️⃣ REJIMLAR (KINO va SERIAL)</b>\n` +
        `<i>⚙️ Loyiha Parametrlari</i> menyusidan ishlash rejimini tanlang:\n` +
        `• <b>Serial rejimi:</b> Videolarga avtomatik <i>S01E01</i> formatida fasl va qism qo'shib sanab boradi.\n` +
        `• <b>Kino rejimi:</b> Fasl va qism raqamlari yashirinadi. Faqat kino nomi va izohlar qoladi.\n\n` +
        `<b>2️⃣ MAVSUMNI YOPISH (SERIAL KONVEYERI)</b>\n` +
        `Agar bir nechta faslni birdaniga joylamoqchi bo'lsangiz:\n` +
        `1. 1-fasl videolarini botga tashlang.\n` +
        `2. <i>🏁 Mavsumni Yopish</i> tugmasini bosing va tasdiqlang.\n` +
        `3. Keyingi fasl videolarini tashlang. Ular avtomat S02E01 dan sanalishni boshlaydi.\n` +
        `4. Barcha fasllarni yig'ib bo'lgach, bittada kanalga joylang!\n\n` +
        `<b>3️⃣ AVTOPILOT VA ANTI-BAN (XAVFSIZLIK)</b>\n` +
        `Kanalga yuzlab videolarni bittada yuborsangiz ham bot xatolik bermaydi. Bot har bir video orasida <b>2 soniya</b>, har 10 ta qismdan so'ng esa <b>5 soniya</b> pauza qilib, xuddi insondek ishlaydi.\n\n` +
        `<b>4️⃣ POSTER JOYLASH (3 QADAM)</b>\n` +
        `Menyudan "🖼 Poster" tugmasini bosing:\n` +
        `1. Matnsiz toza rasmni yuboring.\n` +
        `2. Nomini yuboring (Bot avtomat <i>"Nomi — Seriali Uzbek Tilida"</i> deb yozadi).\n` +
        `3. Ta'rifini yuboring (Bot uni chiroyli qizil qatorga — blockquote ichiga soladi).\n\n` +
        `<b>5️⃣ SHABLONLAR VA ADMINLAR</b>\n` +
        `• <b>🧾 Shablonlar:</b> Doimiy tag-so'zlarni (Audio, Format) saqlab, istalgan payt almashtirishingiz mumkin.\n` +
        `• <b>🛠 Tizim Sozlamalari:</b> Faqat Asosiy Egaga (Owner) ko'rinadi. Yordamchilarni qo'shish va to'liq audit statistikasini shu yerdan ko'rasiz.\n\n` +
        `<i>Ishni boshlash uchun /start buyrug'ini yuboring.</i>`;

    const sent = await ctx.replyWithHTML(helpText, Markup.inlineKeyboard([[Markup.button.callback('⬅️ Menyuga Qaytish', 'action_back_to_menu')]]));
    autoWipe(ctx, sent.message_id, 120000); 
};

function initCommands(bot) {
    bot.command(['start', 'menu'], sendMenu);
    bot.command(['help', 'info'], handleHelp);
}

module.exports = { initCommands };
