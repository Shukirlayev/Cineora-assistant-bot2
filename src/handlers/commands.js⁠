const { sendMenu, waitingFor } = require('../utils/ui');
const { Markup } = require('telegraf');

const handleHelp = async (ctx) => {
    if (waitingFor.menuMessageId) {
        try { await ctx.telegram.deleteMessage(ctx.chat.id, waitingFor.menuMessageId); } catch(e){}
        waitingFor.menuMessageId = null;
    }
    const helpText = `📖 <b>Botdan foydalanish qo'llanmasi:</b>\n\n` +
        `1️⃣ <b>Sarlavha/Shablon kiritish:</b> Avval panelda mos tugmani bosing, keyin matn yuboring.\n` +
        `2️⃣ <b>Videolarni yuklash:</b> Istalgancha videolarni bittada belgilab yuboring, bot ularni qabul qilib, menyuni eng pastga tushiradi.\n\n` +
        `⚙️ <i>Bildirishnomalar 5 soniyada o'chadi. Siz yuborgan original videolar va matnlar chatda arxiv sifatida saqlanadi.</i>`;
    
    const sent = await ctx.replyWithHTML(helpText, Markup.inlineKeyboard([[Markup.button.callback('⬅️ Menyoga qaytish', 'action_back_to_menu')]]));
    waitingFor.menuMessageId = sent.message_id;
};

function initCommands(bot) {
    bot.command(['start', 'menu'], sendMenu);
    bot.command('help', handleHelp);
}

module.exports = { initCommands, handleHelp };
