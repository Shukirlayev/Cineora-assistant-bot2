const { Markup } = require('telegraf');
const { state, saveState, getWorkspace } = require('../services/storage');
const config = require('../config');
const { getSession, generateProgressBar, generateCaption, getMenuText, getMenuKeyboard, sendMenu, autoWipe } = require('../utils/ui');

function initActions(bot) {
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

    // REJIM O'ZGARTIRISH
    bot.action('action_switch_mode', async (ctx) => {
        const ws = getWorkspace(String(ctx.from.id));
        ws.mode = ws.mode === 'serial' ? 'movie' : 'serial';
        await saveState();
        await sendMenu(ctx);
    });

    // MAVSUMNI YOPISH (BATCHING)
    bot.action('action_end_season', async (ctx) => {
        const ws = getWorkspace(String(ctx.from.id));
        if (ws.mode !== 'serial') return ctx.answerCbQuery("Bu funksiya faqat Serial rejimida ishlaydi!", { show_alert: true });
        ws.season += 1;
        await saveState();
        await ctx.answerCbQuery(`✅ S${String(ws.season - 1).padStart(2, '0')} saqlandi! Endi bot navbatdagi S${String(ws.season).padStart(2, '0')} qismlarini kutmoqda.`, { show_alert: true });
        await sendMenu(ctx);
    });

    // SHABLONLAR VA ADMINLAR
    bot.action('menu_templates', async (ctx) => {
        const ws = getWorkspace(String(ctx.from.id));
        let text = `🧾 <b>Shablonlar Menejeri</b>\n\n`;
        const buttons = [];
        if (state.saved_templates.length === 0) text += `<i>Shablon yo'q.</i>`;
        else {
            text += `Faol shablon:\n<code>${ws.template || "Yo'q"}</code>\n\nTanlang:`;
            state.saved_templates.forEach((t, i) => { buttons.push([Markup.button.callback(`✅ ${t.name}`, `apply_tpl_${i}`), Markup.button.callback(`🗑 O'chirish`, `del_tpl_${i}`)]); });
        }
        buttons.push([Markup.button.callback('➕ Yangi Qo\'shish', 'action_addtemplate'), Markup.button.callback('⬅️ Orqaga', 'action_back_to_menu')]);
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
        const text = `⚙️ <b>Tizim Sozlamalari</b>\n\n📈 <b>Tarix:</b>\n• Loyihalar: <b>${state.stats.total_posts} ta</b>\n• Videolar: <b>${state.stats.total_videos} ta</b>\n\n👥 <b>Adminlar:</b> <b>${state.admins.length} kishi</b>`;
        await ctx.editMessageText(text, { parse_mode: 'HTML', ...Markup.inlineKeyboard([[Markup.button.callback('➕ Qo\'shish', 'action_addadmin'), Markup.button.callback('➖ O\'chirish', 'action_deladmin')], [Markup.button.callback('⬅️ Orqaga', 'action_back_to_menu')]]) });
    });

    bot.action('action_addadmin', async (ctx) => {
        getSession(String(ctx.from.id)).waitingFor.type = 'add_admin';
        await ctx.editMessageText(`👥 <b>ID raqamini yuboring:</b>`, { parse_mode: 'HTML', ...Markup.inlineKeyboard([[Markup.button.callback('❌ Bekor qilish', 'menu_settings')]]) });
    });

    bot.action('action_deladmin', async (ctx) => {
        getSession(String(ctx.from.id)).waitingFor.type = 'del_admin';
        await ctx.editMessageText(`🗑 <b>Adminni o'chirish:</b>\nJoriy adminlar:\n• ${state.admins.join('\n• ') || "Yo'q"}\n\nID ni yuboring.`, { parse_mode: 'HTML', ...Markup.inlineKeyboard([[Markup.button.callback('❌ Bekor qilish', 'menu_settings')]]) });
    });

    // NAVBAT VA JOYLASH
    bot.action('action_poster', async (ctx) => {
        const session = getSession(String(ctx.from.id));
        session.waitingFor.type = 'poster_image';
        session.waitingFor.poster = { fileId: null, name: null, desc: null };
        await ctx.editMessageText(`🖼 <b>POSTER (1/3):</b>\nAvval <b>rasmni</b> o'zini yuboring.`, { parse_mode: 'HTML', ...Markup.inlineKeyboard([[Markup.button.callback('❌ Bekor qilish', 'action_cancel_input')]]) });
    });

    bot.action('action_preview', async (ctx) => {
        const ws = getWorkspace(String(ctx.from.id));
        if (ws.queue.length === 0) return ctx.answerCbQuery("Ko'rish uchun navbat bo'sh!", { show_alert: true });
        const lastVideo = ws.queue[ws.queue.length - 1];
        await ctx.editMessageText(`👁 <b>So'nggi yuborilgan video ko'rinishi:</b>\n\n${generateCaption(lastVideo)}`, { parse_mode: 'HTML', ...Markup.inlineKeyboard([[Markup.button.callback('⬅️ Orqaga', 'action_back_to_menu')]]) });
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

    // ANTI-BAN YUKLASH TIZIMI
    bot.action('confirm_post', async (ctx) => {
        try {
            const ws = getWorkspace(String(ctx.from.id));
            const totalVideos = ws.queue.length;
            
            await ctx.editMessageText(`⏳ <b>Kanalga yuklanmoqda... Kuting!</b>\n${generateProgressBar(0, totalVideos)}`, { parse_mode: 'HTML' });
            let successCount = 0;
            let lastText = '';

            for (let i = 0; i < totalVideos; i++) {
                try {
                    await ctx.telegram.sendVideo(config.TELEGRAM_CHANNEL_ID, ws.queue[i].fileId, { caption: generateCaption(ws.queue[i]), parse_mode: 'HTML' });
                    successCount++;
                    const pText = `🚀 <b>Yuklanmoqda... (Oyna yopilmasin)</b>\n\n${generateProgressBar(successCount, totalVideos)}\n✅ <b>${successCount} / ${totalVideos}</b>`;
                    if (pText !== lastText) { await ctx.editMessageText(pText, { parse_mode: 'HTML' }).catch(e=>{}); lastText = pText; }
                    
                    // ANTI-BAN KUTISH ALGORITMI
                    if (i < totalVideos - 1) {
                        await new Promise(resolve => setTimeout(resolve, 2000)); // Har videodan keyin 2s
                        if (successCount % 10 === 0) {
                            await new Promise(resolve => setTimeout(resolve, 5000)); // Har 10 ta videodan keyin 5s
                        }
                    }

                } catch (error) {
                    autoWipe(ctx, (await ctx.reply(`❌ Xato (Video ${i + 1}): ${error.message}`)).message_id, 15000);
                    break; 
                }
            }

            if (successCount > 0) {
                state.stats.total_posts += 1;
                state.stats.total_videos += successCount;
                ws.queue = ws.queue.slice(successCount);
                await saveState();
            }

            const msg = successCount === totalVideos ? `✅ Boooom! Barcha ${successCount} ta qism joylandi.` : `⚠️ Qisman to'xtadi. ${successCount} ta joylandi.`;
            autoWipe(ctx, (await ctx.replyWithHTML(msg)).message_id, 15000);
            await sendMenu(ctx);
        } catch (e) { console.error(e); }
    });
}

module.exports = { initActions };
