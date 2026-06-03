const { state, saveState } = require('../services/storage');
const config = require('../config');
const { waitingFor, autoWipe, queueMenuRefresh, sendMenu } = require('../utils/ui');
const { Markup } = require('telegraf');

function initMedia(bot) {
    bot.on('photo', async (ctx) => {
        try {
            if (waitingFor.type === 'poster_image') {
                waitingFor.poster.fileId = ctx.message.photo[ctx.message.photo.length - 1].file_id;
                waitingFor.type = 'poster_name';
                const info = await ctx.replyWithHTML(`✅ <b>Rasm saqlandi! (2/3)</b>\nNomini yuboring:`, Markup.inlineKeyboard([[Markup.button.callback('❌ Bekor qilish', 'action_cancel_input')]]));
                waitingFor.promptMessageId = info.message_id; 
                return;
            }
            autoWipe(ctx, (await ctx.reply(`⚠️ Rasm qabul qilish rejimi faol emas.`)).message_id, 5000);
        } catch (e) { console.error(e); }
    });

    bot.on('video', async (ctx) => {
        try {
            state.queue.push(ctx.message.video.file_id);
            await saveState();
            const s = String(state.season).padStart(2, '0');
            const e = String(state.queue.length).padStart(2, '0');
            autoWipe(ctx, (await ctx.replyWithHTML(`✅ Video: <b>S${s}E${e}</b>`)).message_id, 5000);
            queueMenuRefresh(ctx, 2000);
        } catch (e) { console.error(e); }
    });

    bot.on('text', async (ctx) => {
        try {
            const text = ctx.message.text;

            // --- ADMIN QO'SHISH / O'CHIRISH ---
            if (waitingFor.type === 'add_admin') {
                if (!state.admins.includes(text)) state.admins.push(text);
                await saveState();
                autoWipe(ctx, (await ctx.replyWithHTML(`✅ <b>${text}</b> admin etib tayinlandi.`)).message_id, 5000);
                await sendMenu(ctx);
                return;
            }
            if (waitingFor.type === 'del_admin') {
                state.admins = state.admins.filter(id => id !== text);
                await saveState();
                autoWipe(ctx, (await ctx.replyWithHTML(`🗑 <b>${text}</b> adminlikdan olindi.`)).message_id, 5000);
                await sendMenu(ctx);
                return;
            }

            // --- SHABLON MENEJERI ---
            if (waitingFor.type === 'template_name') {
                waitingFor.tempTemplateName = text;
                waitingFor.type = 'template_text';
                if (waitingFor.promptMessageId) { try { await ctx.telegram.deleteMessage(ctx.chat.id, waitingFor.promptMessageId); } catch(e){} }
                const info = await ctx.replyWithHTML(`🏷 <b>"${text}"</b> shabloni uchun endi to'liq <b>matnni</b> yuboring:`, Markup.inlineKeyboard([[Markup.button.callback('❌ Bekor qilish', 'action_cancel_input')]]));
                waitingFor.promptMessageId = info.message_id;
                return;
            }
            if (waitingFor.type === 'template_text') {
                state.saved_templates.push({ name: waitingFor.tempTemplateName, text: text });
                await saveState();
                autoWipe(ctx, (await ctx.replyWithHTML(`✅ <b>Yangi shablon saqlandi!</b>`)).message_id, 5000);
                await sendMenu(ctx);
                return;
            }

            // --- POSTER REJIMI ---
            if (waitingFor.type === 'poster_name') {
                waitingFor.poster.name = text;
                waitingFor.type = 'poster_desc';
                if (waitingFor.promptMessageId) { try { await ctx.telegram.deleteMessage(ctx.chat.id, waitingFor.promptMessageId); } catch(e){} }
                const info = await ctx.replyWithHTML(`✅ <b>Nomi olingan! (3/3)</b>\nTa'rifini (description) yuboring:`, Markup.inlineKeyboard([[Markup.button.callback('❌ Bekor qilish', 'action_cancel_input')]]));
                waitingFor.promptMessageId = info.message_id;
                return;
            }
            if (waitingFor.type === 'poster_desc') {
                if (waitingFor.promptMessageId) { try { await ctx.telegram.deleteMessage(ctx.chat.id, waitingFor.promptMessageId); } catch(e){} }
                const caption = `🎬 <b>${waitingFor.poster.name} — Seriali Uzbek Tilida</b>\n\n<blockquote>${text}</blockquote>\n\n@CineoraUz 🍿`;
                try {
                    await ctx.telegram.sendPhoto(config.TELEGRAM_CHANNEL_ID, waitingFor.poster.fileId, { caption: caption, parse_mode: 'HTML' });
                    state.stats.total_posts += 1; // Posterlar ham post statistikasiga qo'shiladi
                    await saveState();
                    waitingFor.type = null;
                    autoWipe(ctx, (await ctx.replyWithHTML(`🎉 <b>Poster muvaffaqiyatli kanalga joylandi!</b>`)).message_id, 6000);
                    await sendMenu(ctx);
                } catch (err) {
                    autoWipe(ctx, (await ctx.reply(`❌ Xato: ${err.message}`)).message_id, 10000);
                }
                return;
            }

            // --- ASOSIY MENYU KIRITMALARI ---
            if (!waitingFor.type) {
                autoWipe(ctx, (await ctx.replyWithHTML(`⚠️ Matn kiritish rejimi faol emas!`)).message_id, 5000);
                await sendMenu(ctx);
                return;
            }

            if (waitingFor.type === 'title') {
                state.title = text;
                autoWipe(ctx, (await ctx.replyWithHTML(`✅ Nomi yangilandi.`)).message_id, 5000);
            } else if (waitingFor.type === 'season') {
                const parsed = parseInt(text, 10);
                if (isNaN(parsed)) return autoWipe(ctx, (await ctx.reply(`❌ Noto'g'ri raqam.`)).message_id, 5000);
                state.season = parsed;
                autoWipe(ctx, (await ctx.replyWithHTML(`✅ Mavsum yangilandi.`)).message_id, 5000);
            } else if (waitingFor.type === 'season_info') {
                state.season_info = text === '/clear' ? "" : text;
                autoWipe(ctx, (await ctx.replyWithHTML(`✅ Izoh yangilandi.`)).message_id, 5000);
            }

            await saveState();
            await sendMenu(ctx);
        } catch (e) {
            console.error(e);
            await sendMenu(ctx);
        }
    });
}

module.exports = { initMedia };
