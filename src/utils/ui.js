const { Markup } = require('telegraf');
const { state, getWorkspace } = require('../services/storage');

// Yangi: Har bir adminning vaqtinchalik xotirasi (UI Sessions)
const sessions = {};

function getSession(userId) {
    if (!sessions[userId]) {
        sessions[userId] = {
            waitingFor: { type: null, menuMessageId: null, promptMessageId: null, poster: { fileId: null, name: null, desc: null }, tempTemplateName: null },
            menuDebounceTimer: null
        };
    }
    return sessions[userId];
}

function generateProgressBar(current, total) {
    if (total === 0) return `[░░░░░░░░░░] 0%`;
    const percent = Math.floor((current / total) * 100);
    const filled = Math.floor(percent / 10);
    const bar = '█'.repeat(filled) + '░'.repeat(10 - filled);
    return `[${bar}] ${percent}%`;
}

function generateCaption(userId, index) {
    const ws = getWorkspace(userId);
    const s = String(ws.season).padStart(2, '0');
    const e = String(index + 1).padStart(2, '0');
    let caption = `<b>${ws.title}</b>\n<b>S${s}E${e}</b>`;
    if (ws.season_info && ws.season_info.trim() !== "") caption += `\n\n${ws.season_info}`;
    if (ws.template && ws.template.trim() !== "") caption += `\n\n${ws.template}`;
    return caption;
}

const getMenuText = (userId) => {
    const ws = getWorkspace(userId);
    const s = String(ws.season).padStart(2, '0');
    let sampleCaption = `<b>${ws.title}</b>\n<b>S${s}E01</b>`;
    if (ws.season_info) sampleCaption += `\n\n${ws.season_info}`;
    if (ws.template) sampleCaption += `\n\n${ws.template}`;

    return `🎛 <b>Boshqaruv Paneli (Shaxsiy Ish Stoli)</b>\n\n` +
           `📝 <b>Joriy ko'rinish (Preview):</b>\n` +
           `----------------------------------------\n` +
           `${sampleCaption}\n` +
           `----------------------------------------\n\n` +
           `📊 <b>Loyiha Holati:</b>\n` +
           `• Mavsum: <code>${ws.season}</code> | Navbatda: <code>${ws.queue.length} ta</code> video`;
};

const getMenuKeyboard = (ctx) => {
    const userId = String(ctx.from.id);
    const ws = getWorkspace(userId);
    
    const buttons = [
        [Markup.button.callback('🎬 Nomi', 'action_settitle'), Markup.button.callback('📺 Fasl', 'action_setseason'), Markup.button.callback('📝 Izoh', 'action_setseasoninfo')],
        [Markup.button.callback('🧾 Shablonlar', 'menu_templates'), Markup.button.callback('🖼 Poster', 'action_poster')],
        [Markup.button.callback(`📋 Navbat (${ws.queue.length})`, 'action_list'), Markup.button.callback('👁 Ko\'rinish', 'action_preview'), Markup.button.callback('🗑 Tozalash', 'action_clear')],
        [Markup.button.callback('🚀 KANALGA JOYLASH', 'action_post')]
    ];
    
    if (ctx.isOwner) {
        buttons.splice(3, 0, [Markup.button.callback('⚙️ Tizim Sozlamalari', 'menu_settings')]);
    }
    return Markup.inlineKeyboard(buttons);
};

const sendMenu = async (ctx) => {
    const userId = String(ctx.from.id);
    const session = getSession(userId);
    const chatId = ctx.chat.id;
    
    session.waitingFor.type = null;
    
    if (session.waitingFor.menuMessageId) {
        try { await ctx.telegram.deleteMessage(chatId, session.waitingFor.menuMessageId); } catch (e) {}
    }
    if (session.waitingFor.promptMessageId) {
        try { await ctx.telegram.deleteMessage(chatId, session.waitingFor.promptMessageId); } catch (e) {}
        session.waitingFor.promptMessageId = null;
    }
    
    try {
        const sent = await ctx.telegram.sendMessage(chatId, getMenuText(userId), {
            parse_mode: 'HTML',
            ...getMenuKeyboard(ctx)
        });
        session.waitingFor.menuMessageId = sent.message_id;
    } catch (err) { console.error("Menyu xatosi:", err); }
};

const queueMenuRefresh = (ctx, delay = 2000) => {
    const userId = String(ctx.from.id);
    const session = getSession(userId);
    if (session.menuDebounceTimer) clearTimeout(session.menuDebounceTimer);
    session.menuDebounceTimer = setTimeout(async () => { await sendMenu(ctx); }, delay);
};

const autoWipe = (ctx, botMsgId, delay = 5000) => {
    setTimeout(async () => {
        try { await ctx.telegram.deleteMessage(ctx.chat.id, botMsgId); } catch (e) {}
    }, delay);
};

module.exports = {
    getSession, generateProgressBar, generateCaption, getMenuText, getMenuKeyboard, sendMenu, queueMenuRefresh, autoWipe
};
