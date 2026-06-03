const { Markup } = require('telegraf');
const { state } = require('../services/storage');

const waitingFor = { type: null, menuMessageId: null, posterFileId: null };
let menuDebounceTimer = null;

// Premium Progress Bar Generatori
function generateProgressBar(current, total) {
    if (total === 0) return `[░░░░░░░░░░] 0%`;
    const percent = Math.floor((current / total) * 100);
    const filled = Math.floor(percent / 10);
    const bar = '█'.repeat(filled) + '░'.repeat(10 - filled);
    return `[${bar}] ${percent}%`;
}

function generateCaption(index) {
    const s = String(state.season).padStart(2, '0');
    const e = String(index + 1).padStart(2, '0');
    let caption = `<b>${state.title}</b>\n<b>S${s}E${e}</b>`;
    
    // Agar mavsumga maxsus izoh kiritilgan bo'lsa
    if (state.season_info && state.season_info.trim() !== "") {
        caption += `\n\n${state.season_info}`;
    }
    // Agar doimiy shablon bo'lsa
    if (state.template && state.template.trim() !== "") {
        caption += `\n\n${state.template}`;
    }
    return caption;
}

const getMenuText = () => {
    const s = String(state.season).padStart(2, '0');
    let sampleCaption = `<b>${state.title}</b>\n<b>S${s}E01</b>`;
    if (state.season_info) sampleCaption += `\n\n${state.season_info}`;
    if (state.template) sampleCaption += `\n\n${state.template}`;

    return `🎛 <b>Boshqaruv Paneli</b>\n\n` +
           `📝 <b>Joriy shablon ko'rinishi (Preview):</b>\n` +
           `----------------------------------------\n` +
           `${sampleCaption}\n` +
           `----------------------------------------\n\n` +
           `📊 <b>Statistika:</b>\n` +
           `• Mavsum raqami: <code>${state.season}</code>\n` +
           `• Navbatdagi videolar: <code>${state.queue.length} ta</code>`;
};

const getMenuKeyboard = () => {
    return Markup.inlineKeyboard([
        [Markup.button.callback('🎬 Nomi', 'action_settitle'), Markup.button.callback('📺 Mavsum', 'action_setseason')],
        [Markup.button.callback('📝 Mavsum Izohi', 'action_setseasoninfo'), Markup.button.callback('🧾 Doimiy Shablon', 'action_settemplate')],
        [Markup.button.callback('📋 Navbat', 'action_list'), Markup.button.callback('👁 Ko\'rinish', 'action_preview')],
        [Markup.button.callback('🗑 Tozalash', 'action_clear'), Markup.button.callback('🖼 Poster Joylash', 'action_poster')],
        [Markup.button.callback('🚀 Kanalga Joylash', 'action_post')]
    ]);
};

const sendMenu = async (ctx) => {
    waitingFor.type = null;
    const chatId = ctx.chat.id;
    
    if (waitingFor.menuMessageId) {
        try { await ctx.telegram.deleteMessage(chatId, waitingFor.menuMessageId); } catch (e) {}
    }
    
    try {
        const sent = await ctx.telegram.sendMessage(chatId, getMenuText(), {
            parse_mode: 'HTML',
            ...getMenuKeyboard()
        });
        waitingFor.menuMessageId = sent.message_id;
    } catch (err) {
        console.error("Menyu uzatishda xato:", err);
    }
};

const queueMenuRefresh = (ctx, delay = 2000) => {
    if (menuDebounceTimer) clearTimeout(menuDebounceTimer);
    menuDebounceTimer = setTimeout(async () => {
        await sendMenu(ctx);
    }, delay);
};

const autoWipe = (ctx, botMsgId, delay = 5000) => {
    setTimeout(async () => {
        try { await ctx.telegram.deleteMessage(ctx.chat.id, botMsgId); } catch (e) {}
    }, delay);
};

module.exports = {
    waitingFor,
    generateProgressBar,
    generateCaption,
    getMenuText,
    getMenuKeyboard,
    sendMenu,
    queueMenuRefresh,
    autoWipe
};
