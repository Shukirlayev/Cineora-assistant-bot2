const { Markup } = require('telegraf');
const { state, saveState } = require('../services/storage');
const config = require('../config');
const { waitingFor, generateProgressBar, generateCaption, getMenuText, getMenuKeyboard, sendMenu, autoWipe } = require('../utils/ui');

function initActions(bot) {
    // --- ASOSIY MENYU TUGMALARI ---
    bot.action('action_settitle', async (ctx) => {
        waitingFor.type = 'title';
        await ctx.editMessageText(`🎬 <b>Kino/Serial nomini yuboring:</b>`, { parse_mode: 'HTML', ...Markup.inlineKeyboard([[Markup.button.callback('❌ Bekor qilish', 'action_cancel_input')]]) });
    });
    bot.action('action_setseason', async (ctx) => {
        waitingFor.type = 'season';
        await ctx.editMessageText(`📺 <b>Mavsum raqamini yuboring:</b>`, { parse_mode: 'HTML', ...Markup.inlineKeyboard([[Markup.button.callback('❌ Bekor qilish', 'action_cancel_input')]]) });
    });
    bot.action('action_setseasoninfo', async (ctx) => {
        waitingFor.type = 'season_info';
        await ctx.editMessageText(`📝 <b>Mavsum tavsifini yuboring:</b>\nBo'sh qoldirish uchun /clear yozing.`, { parse_mode: 'HTML', ...Markup.inlineKeyboard([[Markup.button.callback('❌ Bekor qilish', 'action_cancel_input')]]) });
    });

    // --- SHABLONLAR MENEJERI ---
    bot.action('menu_templates', async (ctx) => {
        let text = `🧾 <b>Shablonlar Menejeri</b>\n\n`;
        const buttons = [];
        
        if (state.saved_templates.length === 0) {
            text += `<i>Hech qanday shablon saqlanmagan.</i>`;
        } else {
            text += `Joriy faol shablon matni:\n<code>${state.template || "Tanlanmagan"}</code>\n\nKerakli shablonni tanlang:`;
            state.saved_templates.forEach((t, i) => {
                buttons.push([Markup.button.callback(`✅ ${t.name}`, `apply_tpl_${i}`), Markup.button.callback(`🗑 O'chirish`, `del_tpl_${i}`)]);
            });
        }
        buttons.push([Markup.button.callback('➕ Yangi Shablon Qo\'shish', 'action_addtemplate')]);
        buttons.push([Markup.button.callback('⬅️ Orqaga', 'action_back_to_menu')]);
        
        await ctx.editMessageText(text, { parse_mode: 'HTML', ...Markup.inlineKeyboard(buttons) });
    });

    bot.action('action_addtemplate', async (ctx) => {
        waitingFor.type = 'template_name';
        await ctx.editMessageText(`🏷 <b>Yangi shablon NOMINI yuboring:</b>\n(Masalan: <i>Serial uchun</i> yoki <i>Anime</i>)`, { parse_mode: 'HTML', ...Markup.inlineKeyboard([[Markup.button.callback('❌ Bekor qilish', 'action_cancel_input')]]) });
    });

    bot.action(/^apply_tpl_(\d+)$/, async (ctx) => {
        const index = parseInt(ctx.match[1]);
        if (state.saved_templates[index]) {
            state.template = state.saved_templates[index].text;
            await saveState();
            await ctx.answerCbQuery('✅ Shablon faollashtirildi!', { show_alert: false });
            await sendMenu(ctx);
        }
    });

    bot.action(/^del_tpl_(\d+)$/, async (ctx) => {
        const index = parseInt(ctx.match[1]);
        state.saved_templates.splice(index, 1);
        await saveState();
        await ctx.answerCbQuery('🗑 Shablon o\'chirildi.', { show_alert: false });
        await sendMenu(ctx);
    });

    // --- TIZIM SOZLAMALARI VA STATISTIKA (Faqat Owner) ---
    bot.action('menu_settings', async (ctx) => {
        if (!ctx.isOwner) return ctx.answerCbQuery("🚫 Ruxsat yo'q!", { show_alert: true });
        
        const stats = state.stats;
        const text = `⚙️ <b>Tizim Sozlamalari va Statistika</b>\n\n` +
                     `📈 <b>Tarixiy ko'rsatkichlar:</b>\n` +
                     `• Joylangan loyihalar (postlar): <b>${stats.total_posts} ta</b>\n` +
                     `• Yuklangan jami videolar: <b>${stats.total_videos} ta</b>\n\n` +
                     `👥 <b>Jamoa:</b>\n` +
                     `• Faol yordamchilar (Adminlar): <b>${state.admins.length} kishi</b>`;

        const buttons = [
            [Markup.button.callback('➕ Admin Qo\'shish', 'action_addadmin'), Markup.button.callback('➖ Admin O\'chirish', 'action_deladmin')],
            [Markup.button.callback('⬅️ Asosiy Menyuga Qaytish', 'action_back_to_menu')]
        ];
        await ctx.editMessageText(text, { parse_mode: 'HTML', ...Markup.inlineKeyboard(buttons) });
    });

    bot.action('action_addadmin', async (ctx) => {
        waitingFor.type = 'add_admin';
        await ctx.editMessageText(`👥 <b>Yangi Yordamchi (Admin) qo'shish:</b>\n\nUning Telegram ID raqamini yuboring. <i>(ID ni @userinfobot orqali bilsa bo'ladi)</i>`, { parse_mode: 'HTML', ...Markup.inlineKeyboard([[Markup.button.callback('❌ Bekor qilish', 'menu_settings')]]) });
    });

    bot.action('action_deladmin', async (ctx) => {
        waitingFor.type = 'del_admin';
        const adminList = state.admins.join('\n• ');
        await ctx.editMessageText(`🗑 <b>Adminni o'chirish:</b>\n\nJoriy adminlar:\n• ${adminList || "Yo'q"}\n\nO'chirmoqchi bo'lgan adminning ID raqamini yuboring.`, { parse_mode: 'HTML', ...Markup.inlineKeyboard([[Markup.button.callback('❌ Bekor qilish', 'menu_settings')]]) });
    });


    // --- NAVBAT VA POST QILISH ---
    bot.action('action_poster', async (ctx) => {
        waitingFor.type = 'poster_image';
        waitingFor.poster = { fileId: null, name: null, desc: null };
        await ctx.editMessageText(`🖼 <b>POSTER (1/3):</b>\nAvval <b>rasmni</b> o'zini (matnsiz) yuboring.`, { parse_mode: 'HTML', ...Markup.inlineKeyboard([[Markup.button.callback('❌ Bekor qilish', 'action_cancel_input')]]) });
    });

    bot.action('action_preview', async (ctx) => {
        const nextIndex = state.queue.length;
        await ctx.editMessageText(`👁 <b>Ko'rinish (E${String(nextIndex + 1).padStart(2, '0')}):</b>\n\n${generateCaption(nextIndex)}`, { parse_mode: 'HTML', ...Markup.inlineKeyboard([[Markup.button.callback('⬅️ Orqaga', 'action_back_to_menu')]]) });
    });

    bot.action('action_list', async (ctx) => {
        if (state.queue.length === 0) return ctx.editMessageText(`📋 Navbat bo'sh.`, Markup.inlineKeyboard([[Markup.button.callback('⬅️ Orqaga', 'action_back_to_menu')]]));
        const listText = state.queue.map((_, i) => `• E${String(i + 1).padStart(2, '0')}`).join('\n');
        await ctx.editMessageText(`📋 <b>Navbat:</b>\n\n${listText}`, { parse_mode: 'HTML', ...Markup.inlineKeyboard([[Markup.button.callback('⬅️ Orqaga', 'action_back_to_menu')]]) });
    });

    bot.action('action_clear', async (ctx) => {
        await ctx.editMessageText(`⚠️ <b>Videolarni tozalaysizmi?</b>`, { parse_mode: 'HTML', ...Markup.inlineKeyboard([[Markup.button.callback('🗑 HA', 'confirm_clear'), Markup.button.callback('❌ YO\'Q', 'action_back_to_menu')]]) });
    });

    bot.action('action_post', async (ctx) => {
        if (state.queue.length === 0) return ctx.answerCbQuery(`❌ Navbat bo'sh!`, { show_alert: true });
        const confirmationText = `🚀 <b>Jami ${state.queue.length} ta video joylanadi.</b>\n\n<b>[1-qism]:</b>\n${generateCaption(0)}\n\n⚠️ Tasdiqlaysizmi?`;
        await ctx.editMessageText(confirmationText, { parse_mode: 'HTML', ...Markup.inlineKeyboard([[Markup.button.callback('🚀 JOYLASH', 'confirm_post')], [Markup.button.callback('❌ BEKOR QILISH', 'action_back_to_menu')]]) });
    });

    // --- NAYGATSIYA VA TASDIQLASHLAR ---
    bot.action('action_back_to_menu', async (ctx) => {
        try { await ctx.editMessageText(getMenuText(), { parse_mode: 'HTML', ...getMenuKeyboard(ctx) }); } catch (e) { await sendMenu(ctx); }
    });
    bot.action('action_cancel_input', async (ctx) => { try { await sendMenu(ctx); } catch (e) {} });

    bot.action('confirm_clear', async (ctx) => {
        state.queue = [];
        await saveState();
        autoWipe(ctx, (await ctx.replyWithHTML(`🗑 Navbat tozalandi.`)).message_id, 5000);
        await sendMenu(ctx);
    });

    bot.action('confirm_post', async (ctx) => {
        try {
            const totalVideos = state.queue.length;
            await ctx.editMessageText(`⏳ <b>Yuklanmoqda...</b>\n${generateProgressBar(0, totalVideos)}`, { parse_mode: 'HTML' });
            let successCount = 0;
            let lastText = '';

            for (let i = 0; i < totalVideos; i++) {
                try {
                    await ctx.telegram.sendVideo(config.TELEGRAM_CHANNEL_ID, state.queue[i], { caption: generateCaption(i), parse_mode: 'HTML' });
                    successCount++;
                    const pText = `🚀 <b>Yuklanmoqda...</b>\n\n${generateProgressBar(successCount, totalVideos)}\n✅ <b>${successCount} / ${totalVideos}</b>`;
                    if (pText !== lastText) { await ctx.editMessageText(pText, { parse_mode: 'HTML' }).catch(e=>{}); lastText = pText; }
                } catch (error) {
                    autoWipe(ctx, (await ctx.reply(`❌ Xato (E${String(i + 1).padStart(2, '0')}): ${error.message}`)).message_id, 15000);
                    break; 
                }
            }

            // Statistika hisob-kitobi qo'shildi
            if (successCount > 0) {
                state.stats.total_posts += 1;
                state.stats.total_videos += successCount;
                state.queue = state.queue.slice(successCount);
                await saveState();
            }

            const msg = successCount === totalVideos ? `✅ Jami ${successCount} ta qism joylandi.` : `⚠️ Qisman to'xtadi. ${successCount} ta joylandi.`;
            autoWipe(ctx, (await ctx.replyWithHTML(msg)).message_id, 10000);
            await sendMenu(ctx);
        } catch (e) { console.error(e); }
    });
}

module.exports = { initActions };
