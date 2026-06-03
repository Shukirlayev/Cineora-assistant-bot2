const { Markup } = require('telegraf');
const { state, saveState } = require('../services/storage');
const config = require('../config');
const { waitingFor, generateCaption, getMenuText, getMenuKeyboard, sendMenu, autoWipe } = require('../utils/ui');

function initActions(bot) {
    bot.action('action_settitle', async (ctx) => {
        waitingFor.type = 'title';
        const keyboard = Markup.inlineKeyboard([[Markup.button.callback('❌ Bekor qilish', 'action_cancel_input')]]);
        await ctx.editMessageText(`🎬 <b>Kino yoki Serial nomini yuboring:</b>\n<i>(Masalan: Dark)</i>`, { parse_mode: 'HTML', ...keyboard });
    });

    bot.action('action_setseason', async (ctx) => {
        waitingFor.type = 'season';
        const keyboard = Markup.inlineKeyboard([[Markup.button.callback('❌ Bekor qilish', 'action_cancel_input')]]);
        await ctx.editMessageText(`📺 <b>Mavsum raqamini yuboring:</b>\n<i>(Masalan: 1 yoki 5)</i>`, { parse_mode: 'HTML', ...keyboard });
    });

    bot.action('action_settemplate', async (ctx) => {
        waitingFor.type = 'template';
        const keyboard = Markup.inlineKeyboard([[Markup.button.callback('❌ Bekor qilish', 'action_cancel_input')]]);
        await ctx.editMessageText(`🧾 <b>Doimiy shablon matnini yuboring:</b>\n<i>(Masalan:</i>\n<code>Video: 1080p\nAudio: Uzb\n@CineoraUz</code><i>)</i>`, { parse_mode: 'HTML', ...keyboard });
    });

    bot.action('action_preview', async (ctx) => {
        const nextIndex = state.queue.length;
        const previewCaption = generateCaption(nextIndex);
        const keyboard = Markup.inlineKeyboard([[Markup.button.callback('⬅️ Orqaga', 'action_back_to_menu')]]);
        await ctx.editMessageText(`👁 <b>Navbatdagi qism ko'rinishi (E${String(nextIndex + 1).padStart(2, '0')}):</b>\n\n${previewCaption}`, { parse_mode: 'HTML', ...keyboard });
    });

    bot.action('action_list', async (ctx) => {
        const keyboard = Markup.inlineKeyboard([[Markup.button.callback('⬅️ Orqaga', 'action_back_to_menu')]]);
        if (state.queue.length === 0) {
            return ctx.editMessageText(`📋 Navbatda hech qanday video yo'q.`, keyboard);
        }
        const listText = state.queue.map((_, i) => `• E${String(i + 1).padStart(2, '0')}`).join('\n');
        await ctx.editMessageText(`📋 <b>Navbatdagi qismlar ro'yxati:</b>\n\n${listText}`, { parse_mode: 'HTML', ...keyboard });
    });

    bot.action('action_clear', async (ctx) => {
        const keyboard = Markup.inlineKeyboard([
            [Markup.button.callback('🗑 HA, TOZALANSIN', 'confirm_clear'), Markup.button.callback('❌ BEKOR QILISH', 'action_back_to_menu')]
        ]);
        await ctx.editMessageText(`⚠️ <b>Rostdan ham navbatdagi barcha videolarni o'chirmoqchimisiz?</b>`, { parse_mode: 'HTML', ...keyboard });
    });

    bot.action('action_post', async (ctx) => {
        if (state.queue.length === 0) {
            return ctx.answerCbQuery(`❌ Navbat bo'sh! Avval video yuboring.`, { show_alert: true });
        }
        if (!config.TELEGRAM_CHANNEL_ID) {
            return ctx.answerCbQuery(`❌ TELEGRAM_CHANNEL_ID sozlanmagan!`, { show_alert: true });
        }

        const firstPreview = generateCaption(0);
        const lastPreview = generateCaption(state.queue.length - 1);
        const keyboard = Markup.inlineKeyboard([
            [Markup.button.callback('🚀 HA, KANALGA JOYLANSIN', 'confirm_post'), Markup.button.callback('❌ BEKOR QILISH', 'action_back_to_menu')]
        ]);

        const confirmationText = `🚀 <b>Kanalga jami ${state.queue.length} ta video quyidagi ko'rinishda joylanadi:</b>\n\n` +
            `<b>[Birinchi qism]:</b>\n${firstPreview}\n` +
            `----------------------------------------\n` +
            `<b>[Oxirgi qism]:</b>\n${lastPreview}\n\n` +
            `⚠️ Tasdiqlaysizmi?`;

        await ctx.editMessageText(confirmationText, { parse_mode: 'HTML', ...keyboard });
    });

    bot.action('action_back_to_menu', async (ctx) => {
        try {
            await ctx.editMessageText(getMenuText(), { parse_mode: 'HTML', ...getMenuKeyboard() });
        } catch (e) { await sendMenu(ctx); }
    });

    bot.action('action_cancel_input', async (ctx) => {
        try { await sendMenu(ctx); } catch (e) {}
    });

    bot.action('confirm_clear', async (ctx) => {
        try {
            state.queue = [];
            await saveState();
            const info = await ctx.replyWithHTML(`🗑 Navbat muvaffaqiyatli tozalandi.`);
            autoWipe(ctx, info.message_id);
            await sendMenu(ctx);
        } catch (e) { console.error(e); }
    });

    bot.action('confirm_post', async (ctx) => {
        try {
            await ctx.editMessageText('🚀 Kanalga yuklash boshlandi, iltimos kuting...');
            let successCount = 0;

            for (let i = 0; i < state.queue.length; i++) {
                try {
                    await ctx.telegram.sendVideo(config.TELEGRAM_CHANNEL_ID, state.queue[i], {
                        caption: generateCaption(i),
                        parse_mode: 'HTML'
                    });
                    successCount++;
                } catch (error) {
                    const errNotif = await ctx.reply(`❌ Xatolik yuz berdi (Qism index ${i}): ${error.message}`);
                    autoWipe(ctx, errNotif.message_id, 15000);
                    break; 
                }
            }

            if (successCount === state.queue.length && state.queue.length > 0) {
                state.queue = [];
                await saveState();
                const statusNotif = await ctx.replyWithHTML(`✅ Muvaffaqiyatli bajarildi! Jami ${successCount} ta qism kanalga joylandi.`);
                autoWipe(ctx, statusNotif.message_id);
            } else if (successCount > 0) {
                state.queue = state.queue.slice(successCount);
                await saveState();
                const partialNotif = await ctx.replyWithHTML(`⚠️ Yuklash qisman to'xtadi. ${successCount} ta qism joylandi.`);
                autoWipe(ctx, partialNotif.message_id);
            }
            await sendMenu(ctx);
        } catch (e) { console.error(e); }
    });
}

module.exports = { initActions };
