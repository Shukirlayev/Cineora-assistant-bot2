const { Markup } = require('telegraf');
const { state, getWorkspace } = require('../services/storage');

const sessions = {};

function getSession(userId) {
    if (!sessions[userId]) {
        sessions[userId] = {
            waitingFor: { type: null, menuMessageId: null, promptMessageId: null, poster: { fileId: null, name: null, desc: null, finalCaption: null }, tempTemplateName: null },
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

function generateCaption(videoMeta) {
    let caption = `<b>${videoMeta.title}</b>`;
    if (videoMeta.mode === 'serial') {
        const s = String(videoMeta.season).padStart(2, '0');
        const e = String(videoMeta.episode).padStart(2, '0');
        caption += `\n<b>S${s}E${e}</b>`;
    }
    if (videoMeta.season_info && videoMeta.season_info.trim() !== "") caption += `\n\n${videoMeta.season_info}`;
    if (videoMeta.template && videoMeta.template.trim() !== "") caption += `\n\n${videoMeta.template}`;
    return caption;
}

const getMenuText = (userId) => {
    const ws = getWorkspace(userId);
    const nextEp = ws.queue.filter(v => v.season === ws.season).length + 1;
    const previewMeta = { title: ws.title, season: ws.season, episode: nextEp, mode: ws.mode, season_info: ws.season_info, template: ws.template };
    
    return `🎛 <b>Boshqaruv Paneli</b>\n\n` +
           `📝 <b>Navbatdagi Preview:</b>\n` +
           `----------------------------------------\n` +
           `${generateCaption(previewMeta)}\n` +
           `----------------------------------------\n\n` +
           `📊 <b>Loyiha holati:</b> ${ws.mode === 'serial' ? `Fasl: <code>${ws.season}</code> | ` : ''}Navbatda: <code>${ws.queue.length} ta</code> video`;
};

const getMenuKeyboard = (ctx) => {
    const ws = getWorkspace(String(ctx.from.id));
    
    const buttons = [
        [Markup.button.callback('⚙️ Loyiha Parametrlari', 'menu_project_settings')],
        [Markup.button.callback('🖼 Poster', 'action_poster'), Markup.button.callback('👁 Ko\'rinish', 'action_preview')],
        [Markup.button.callback(`📋 Navbat (${ws.queue.length})`, 'action_list'), Markup.button.callback('🏁 Mavsumni Yopish', 'action_end_season')],
        [Markup.button.callback('🗑 Tozalash', 'action_clear'), Markup.button.callback('🚀 KANALGA JOYLASH', 'action_post')]
    ];
    
    if (ctx.isOwner) {
        buttons.push([Markup.button.callback('🛠 Tizim & Statistika', 'menu_settings')]);
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
        const sent = await ctx.telegram.sendMessage(chatId, getMenuText(userId), { parse_mode: 'HTML', ...getMenuKeyboard(ctx) });
        session.waitingFor.menuMessageId = sent.message_id;
    } catch (err) { console.error('Menyu xatosi:', err); }
};

const queueMenuRefresh = (ctx, delay = 2000) => {
    const session = getSession(String(ctx.from.id));
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
