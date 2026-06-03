const { Markup } = require('telegraf');
const { state, saveState, getWorkspace } = require('../services/storage');
const config = require('../config');
const { getSession, generateProgressBar, generateCaption, getMenuText, getMenuKeyboard, sendMenu, autoWipe } = require('../utils/ui');

function initActions(bot) {
    bot.action('menu_project_settings', async (ctx) => {
        const ws = getWorkspace(String(ctx.from.id));
        const modeText = ws.mode === 'serial' ? '🔀 Rejim: Serial' : '🔀 Rejim: Kino';
        const text = `⚙️ <b>Loyiha Parametrlari</b>\n\nBu yerdan serial yoki kino nomini, joriy faslni va izohlarni sozlashingiz mumkin.\nJoriy holat: <b>${ws.mode.toUpperCase()}</b>`;
        const buttons = [
            [Markup.button.callback('🎬 Nom', 'action_settitle'), Markup.button.callback('📺 Fasl', 'action_setseason')],
            [Markup.button.callback('📝 Izoh', 'action_setseasoninfo'), Markup.button.callback(modeText, 'action_switch_mode')],
            [Markup.button.callback('🧾 Shablonlar', 'menu_templates')],
            [Markup.button.callback('⬅️ Orqaga', 'action_back_to_menu')]
        ];
        await ctx.editMessageText(text, { parse_mode: 'HTML', ...Markup.inlineKeyboard(buttons) });
    });

    bot.action('action_settitle', async (ctx) => {
        getSession(String(ctx.from.id)).waitingFor.type = 'title';
        await ctx.editMessageText(`🎬 <b>Kino/Serial nomini yuboring:</b>`, { parse_mode: 'HTML', ...Markup.inlineKeyboard([[Markup.button.callback('❌ Bekor qilish', 'action_cancel_input')]]) });
    });
    bot.action('action_setseason', async (ctx) => {
        getSession(String(ctx.from.id)).waitingFor.type = 'season';
        await ctx.editMessageText(`📺 <b>Mavsum raqamini yuboring:</b>`, { parse_mode: 'HTML', ...Markup.inlineKeyboard([[Markup.button.callback('❌ Bekor qilish', 'action_cancel_input')]]) });
    });
    bot.action('action_setseasoninfo', async (ctx) => {
        getSession(String(ctx.from.id)).waitingFor.type = 'season_info';
        await ctx.editMessageText(`📝 <b>Fasl/Kino izohini yuboring:</b>\nBo'sh qoldirish uchun /clear`, { parse_mode: 'HTML', ...Markup.inlineKeyboard([[Markup.button.callback('❌ Bekor qilish', 'action_cancel_input')]]) });
    });

    bot.action('action_switch_mode', async (ctx) => {
        const ws = getWorkspace(String(ctx.from.id));
        ws.mode = ws.mode === 'serial' ? 'movie' : 'serial';
        await saveState();
        await ctx.answerCbQuery(`Rejim o'zgardi: ${ws.mode.toUpperCase()}`, { show_alert: false });
        
        const modeText = ws.mode === 'serial' ? '🔀 Rejim: Serial' : '🔀 Rejim: Kino';
        const text = `⚙️ <b>Loyiha Parametrlari</b>\n\nJoriy holat: <b>${ws.mode.toUpperCase()}</b>`;
        const buttons = [
            [Markup.button.callback('🎬 Nom', 'action_settitle'), Markup.button.callback('📺 Fasl', 'action_setseason')],
            [Markup.button.callback('📝 Izoh', 'action_setseasoninfo'), Markup.button.callback(modeText, 'action_switch_mode')],
            [Markup.button.callback('🧾 Shablonlar', 'menu_templates')],
            [Markup.button.callback('⬅️ Orqaga', 'action_back_to_menu')]
        ];
        await ctx.editMessageText(text, { parse_mode: 'HTML', ...Markup.inlineKeyboard(buttons) });
    });

    bot.action('action_end_season', async (ctx) => {
        const ws = getWorkspace(String(ctx.from.id));
        if (ws.mode !== 'serial') return ctx.answerCbQuery('Bu tugma faqat Serial rejimida ishlaydi!', { show_alert: true });
        
        const text = `⚠️ <b>S${String(ws.season).padStart(2, '0')} ni yopamizmi?</b>\n\nBu barcha taxlangan qismlarni tasdiqlab, navbatdagi S${String(ws.season + 1).padStart(2, '0')} ga o'tishga tayyorlaydi.`;
        const buttons = [[Markup.button.callback('🏁 HA, YOPISH', 'confirm_end_season'), Markup.button.callback('❌ BEKOR QILISH', 'action_back_to_menu')]];
        await ctx.editMessageText(text, { parse_mode: 'HTML', ...Markup.inlineKeyboard(buttons) });
    });

    bot.action('confirm_end_season', async (ctx) => {
        const ws = getWorkspace(String(ctx.from.id));
        ws.season += 1;
        await saveState();
        autoWipe(ctx, (await ctx.replyWithHTML(`✅ <b>S${String(ws.season - 1).padStart(2, '0')} yopildi!</b>\nEndi S${String(ws.season).padStart(2, '0')} qismlarini yuborishingiz mumkin.`)).message_id, 8000);
        await sendMenu(ctx);
    });

    bot.action('menu_templates', async (ctx) => {
        const ws = getWorkspace(String(ctx.from.id));
        let text = `🧾 <b>Shablonlar Menejeri</b>\n\nFaol shablon:\n<code>${ws.template || "Yo'q"}</code>\n\nTanlang:`;
        const buttons = [];
        state.saved_templates.forEach((t, i) => { buttons.push([Markup.button.callback(`✅ ${t.name}`, `apply_tpl_${i}`), Markup.button.callback(`🗑 O'chirish`, `del_tpl_${i}`)]); });
        buttons.push([Markup.button.callback('➕ Yangi Qo\'shish', 'action_addtemplate'), Markup.button.callback('⬅️ Orqaga', 'menu_project_settings')]);
        await ctx.editMessageText(text, { parse_mode: 'HTML', ...Markup.inlineKeyboard(buttons) });
    });

    bot.action('action_addtemplate', async (ctx) => {
        getSession(String(ctx.from.id)).waitingFor.type = 'template_name';
        await ctx.editMessageText(`🏷 <b>Yangi shablon NOMINI yuboring:</b>`, { parse_mode: 'HTML', ...Markup.inlineKeyboard([[Markup.button.callback('❌ Bekor qilish', 'action_cancel_input')]]) });
    });

    bot.action(/^apply_tpl_(\d+)$/, async (ctx) => {
        const index = parseInt(ctx.match[1]);
        const ws = getWorkspace(String(ctx.from.id));
        if (state.saved_templates[index]) { ws.template = state.saved_templates[index].text; await saveState(); await sendMenu(ctx); }
    });

    bot.action(/^del_tpl_(\d+)$/, async (ctx) => {
        state.saved_templates.splice(parseInt(ctx.match[1]), 1); await saveState(); await sendMenu(ctx);
    });

    bot.action('menu_settings', async (ctx) => {
        if (!ctx.isOwner) return ctx.answerCbQuery("🚫 Ruxsat yo'q!", { show_alert: true });
        
        let histText = '<i>Hali hech qanday loyiha joylanmagan.</i>';
        if (state.stats.history && state.stats.history.length > 0) {
            histText = state.stats.history.slice(0, 5).map(h => 
                `▪️ <b>${h.title}</b> (${h.type === 'poster' ? 'Poster' : (h.type === 'serial' ? `S${h.season} | ${h.episodes} qism` : `Kino | ${h.episodes} ta video`)})\n` +
                `👤 Admin ID: <code>${h.admin}</code>\n` +
                `🕒 ${h.date}`
            ).join('\n\n');
        }

        const text = `⚙️ <b>Tizim Sozlamalari va Barcha Statistikalar</b>\n\n` +
                     `📈 <b>Umumiy ko'rsatkich:</b>\n` +
                     `• Loyihalar: <b>${state.stats.total_posts} ta</b>\n` +
                     `• Videolar: <b>${state.stats.total_videos} ta</b>\n\n` +
                     `👥 <b>Adminlar:</b> <b>${state.admins.length} kishi</b>\n\n` +
                     `🗓 <b>So'nggi 5 ta amal tarixi:</b>\n${histText}`;
                     
        const buttons = [[Markup.button.callback('➕ Qo\'shish', 'action_addadmin'), Markup.button.callback('➖ O\'chirish', 'action_deladmin')], [Markup.button.callback('⬅️ Orqaga', 'action_back_to_menu')]];
        await ctx.editMessageText(text, { parse_mode: 'HTML', ...Markup.inlineKeyboard(buttons) });
    });

    bot.action('action_addadmin', async (ctx) => {
        getSession(String(ctx.from.id)).waitingFor.type = 'add_admin';
        await ctx.editMessageText(`👥 <b>ID raqamini yuboring:</b>`, { parse_mode: 'HTML', ...Markup.inlineKeyboard([[Markup.button.callback('❌ Bekor qilish', 'menu_settings')]]) });
    });

    bot.action('action_deladmin', async (ctx) => {
        getSession(String(ctx.from.id)).waitingFor.type = 'del_admin';
        await ctx.editMessageText(`🗑 <b>Adminni o'chirish:</b>\nJoriy adminlar:\n• ${state.admins.join('\n• ') || "Yo'q"}\n\nID ni yuboring.`, { parse_mode: 'HTML', ...Markup.inlineKeyboard([[Markup.button.callback('❌ Bekor qilish', 'menu_settings')]]) });
    });

    bot.action('action_poster', async (ctx) => {
        const session = getSession(String(ctx.from.id));
        session.waitingFor.type = 'poster_image';
        session.waitingFor.poster = { fileId: null, name: null, desc: null, finalCaption: null };
        await ctx.editMessageText(`🖼 <b>POSTER (1/3):</b>\nAvval <b>rasmni</b> o'zini yuboring.`, { parse_mode: 'HTML', ...Markup.inlineKeyboard([[Markup.button.callback('❌ Bekor qilish', 'action_cancel_input')]]) });
    });

    bot.action('confirm_poster_send', async (ctx) => {
        const userId = String(ctx.from.id);
        const session = getSession(userId);
        
        if (!session.waitingFor.poster || !session.waitingFor.poster.fileId) {
            return ctx.answerCbQuery("Xatolik: Ma'lumotlar topilmadi.", { show_alert: true });
        }
        
        try {
            await ctx.telegram.sendPhoto(config.TELEGRAM_CHANNEL_ID, session.waitingFor.poster.fileId, {
                caption: session.waitingFor.poster.finalCaption,
                parse_mode: 'HTML'
            });
            
            state.stats.total_posts += 1; 
            state.stats.history.unshift({
                type: 'poster',
                title: session.waitingFor.poster.name,
                admin: userId,
                date: new Date().toLocaleString('uz-UZ', { timeZone: 'Asia/Tashkent', hour12: false })
            });
            if (state.stats.history.length > 50) state.stats.history.pop();
            await saveState();

            if (session.waitingFor.promptMessageId) {
                try { await ctx.telegram.deleteMessage(ctx.chat.id, session.waitingFor.promptMessageId); } catch(e){}
                session.waitingFor.promptMessageId = null;
            }
            
            session.waitingFor.type = null;
            session.waitingFor.poster = { fileId: null, name: null, desc: null, finalCaption: null };

            autoWipe(ctx, (await ctx.replyWithHTML(`🎉 <b>Poster muvaffaqiyatli kanalga joylandi!</b>`)).message_id, 6000);
            await sendMenu(ctx);
        } catch (err) {
            autoWipe(ctx, (await ctx.reply(`❌ Xato: ${err.message}`)).message_id, 10000);
        }
    });

    bot.action('action_preview', async (ctx) => {
        const ws = getWorkspace(String(ctx.from.id));
        if (ws.queue.length === 0) return ctx.answerCbQuery("Ko'rish uchun navbat bo'sh!", { show_alert: true });
        const lastVideo = ws.queue[ws.queue.length - 1];
        await ctx.editMessageText(`👁 <b>So'nggi video ko'rinishi:</b>\n\n${generateCaption(lastVideo)}`, { parse_mode: 'HTML', ...Markup.inlineKeyboard([[Markup.button.callback('⬅️ Orqaga', 'action_back_to_menu')]]) });
    });

    bot.action('action_list', async (ctx) => {
        const ws = getWorkspace(String(ctx.from.id));
        if (ws.queue.length === 0) return ctx.editMessageText(`📋 Navbat bo'sh.`, Markup.inlineKeyboard([[Markup.button.callback('⬅️ Orqaga', 'action_back_to_menu')]]));
        const listText = ws.queue.map(v => `• ${v.mode === 'serial' ? `S${String(v.season).padStart(2, '0')}E${String(v.episode).padStart(2, '0')}` : 'Kino'}`).join('\n');
        await ctx.editMessageText(`📋 <b>Navbat:</b>\n\n${listText}`, { parse_mode: 'HTML', ...Markup.inlineKeyboard([[Markup.button.callback('⬅️ Orqaga', 'action_back_to_menu')]]) });
    });

    bot.action('action_clear', async (ctx) => {
        await ctx.editMessageText(`⚠️ <b>Barcha tayyorlangan fasl va videolar o'chirilsinmi?</b>`, { parse_mode: 'HTML', ...Markup.inlineKeyboard([[Markup.button.callback('🗑 HA', 'confirm_clear'), Markup.button.callback('❌ YO\'Q', 'action_back_to_menu')]]) });
    });

    bot.action('action_post', async (ctx) => {
        const ws = getWorkspace(String(ctx.from.id));
        if (ws.queue.length === 0) return ctx.answerCbQuery(`❌ Navbat bo'sh!`, { show_alert: true });
        const confirmationText = `🚀 <b>Jami ${ws.queue.length} ta video joylanadi.</b>\n\n<b>[1-video]:</b>\n${generateCaption(ws.queue[0])}\n\n⚠️ Tasdiqlaysizmi?`;
        await ctx.editMessageText(confirmationText, { parse_mode: 'HTML', ...Markup.inlineKeyboard([[Markup.button.callback('🚀 ZUDLIK BILAN JOYLASH', 'confirm_post')], [Markup.button.callback('❌ BEKOR QILISH', 'action_back_to_menu')]]) });
    });

    bot.action('action_back_to_menu', async (ctx) => { try { await ctx.editMessageText(getMenuText(String(ctx.from.id)), { parse_mode: 'HTML', ...getMenuKeyboard(ctx) }); } catch (e) { await sendMenu(ctx); } });
    bot.action('action_cancel_input', async (ctx) => { try { await sendMenu(ctx); } catch (e) {} });

    bot.action('confirm_clear', async (ctx) => {
        const ws = getWorkspace(String(ctx.from.id));
        ws.queue = [];
        await saveState();
        autoWipe(ctx, (await ctx.replyWithHTML(`🗑 Navbat tozalandi.`)).message_id, 5000);
        await sendMenu(ctx);
    });

    // 🚀 O'TA TEZKOR YUKLASH VA AQLLI KUTISH (SMART RETRY) TIZIMI
    bot.action('confirm_post', async (ctx) => {
        try {
            const userId = String(ctx.from.id);
            const ws = getWorkspace(userId);
            const totalVideos = ws.queue.length;
            
            await ctx.editMessageText(`⏳ <b>Kanalga yuklanmoqda... Kuting!</b>\n${generateProgressBar(0, totalVideos)}`, { parse_mode: 'HTML' });
            let successCount = 0;
            let lastText = '';
            let hasFatalError = false;

            for (let i = 0; i < totalVideos; i++) {
                let isUploaded = false;
                
                // Video muvaffaqiyatli yuklanmaguncha yoki jiddiy xato chiqmaguncha harakat qiladi
                while (!isUploaded) {
                    try {
                        await ctx.telegram.sendVideo(config.TELEGRAM_CHANNEL_ID, ws.queue[i].fileId, { caption: generateCaption(ws.queue[i]), parse_mode: 'HTML' });
                        successCount++;
                        isUploaded = true;
                        
                        const pText = `🚀 <b>Yuklanmoqda... (Oyna yopilmasin)</b>\n\n${generateProgressBar(successCount, totalVideos)}\n✅ <b>${successCount} / ${totalVideos}</b>`;
                        if (pText !== lastText) { await ctx.editMessageText(pText, { parse_mode: 'HTML' }).catch(e=>{}); lastText = pText; }
                        
                    } catch (error) {
                        // 429 xatosi - Telegram "Too Many Requests" rate limiti
                        if (error.code === 429) {
                            // Telegram qancha kutish kerakligini aytadi. Agar aytmasa zaxira sifatida 30s kutamiz
                            const retryAfter = error.response?.parameters?.retry_after || 30; 
                            
                            const waitText = `⏳ <b>Telegram Cheklovi!</b>\nTelegram qisqa tanaffus so'radi. Bot <b>${retryAfter} soniya</b> kutmoqda (avtomat davom etadi)...\n\n${generateProgressBar(successCount, totalVideos)}\n✅ <b>${successCount} / ${totalVideos}</b>`;
                            if (waitText !== lastText) { await ctx.editMessageText(waitText, { parse_mode: 'HTML' }).catch(e=>{}); lastText = waitText; }
                            
                            // Aytilgan vaqtdan 1 soniya ko'proq kutib qayta urinamiz
                            await new Promise(resolve => setTimeout(resolve, (retryAfter + 1) * 1000)); 
                        } else {
                            // Agar umuman boshqa xato bo'lsa (masalan fayl o'chib ketgan bo'lsa), jarayonni to'xtatadi
                            autoWipe(ctx, (await ctx.reply(`❌ Xato (Video ${i + 1}): ${error.message}`)).message_id, 15000);
                            hasFatalError = true;
                            break; 
                        }
                    }
                }
                
                if (hasFatalError) break;
            }

            // Yuklash tugagach (to'liq yoki qisman) statistika va bazani saqlash
            if (successCount > 0) {
                state.stats.total_posts += 1;
                state.stats.total_videos += successCount;
                
                state.stats.history.unshift({
                    type: ws.mode,
                    title: ws.title,
                    season: ws.mode === 'serial' ? ws.season : null,
                    episodes: successCount,
                    admin: userId,
                    date: new Date().toLocaleString('uz-UZ', { timeZone: 'Asia/Tashkent', hour12: false })
                });
                if (state.stats.history.length > 50) state.stats.history.pop();

                ws.queue = ws.queue.slice(successCount);
                await saveState();
            }

            const msg = successCount === totalVideos ? `✅ Boooom! Barcha ${successCount} ta qism muvaffaqiyatli joylandi.` : `⚠️ Qisman to'xtadi. ${successCount} ta joylandi. Qolganlari navbatda qoldi.`;
            autoWipe(ctx, (await ctx.replyWithHTML(msg)).message_id, 15000);
            await sendMenu(ctx);
        } catch (e) { console.error(e); }
    });
}

module.exports = { initActions };
