const { state, saveState } = require('../services/storage');
const config = require('../config');
const { waitingFor, autoWipe, queueMenuRefresh, sendMenu } = require('../utils/ui');
const { Markup } = require('telegraf');

function initMedia(bot) {
    
    // RASM TUTUVCHI
    bot.on('photo', async (ctx) => {
        try {
            if (waitingFor.type === 'poster_image') {
                const photoArray = ctx.message.photo;
                waitingFor.poster.fileId = photoArray[photoArray.length - 1].file_id;
                waitingFor.type = 'poster_name';

                const keyboard = Markup.inlineKeyboard([[Markup.button.callback('❌ Bekor qilish', 'action_cancel_input')]]);
                const info = await ctx.replyWithHTML(`✅ <b>Rasm saqlandi! (2/3-qadam)</b>\n\nEndi faqat serialning <b>nomini</b> oddiy matnda yuboring.\n<i>Bot uning boshiga avtomat emoji qo'yadi va "— Seriali Uzbek Tilida" matnini qalin qilib qo'shadi.</i>\n\nMasalan: <b>Dark</b>`, keyboard);
                autoWipe(ctx, info.message_id, 15000);
                return;
            }
            const warn = await ctx.reply(`⚠️ Rasm qabul qilish rejimi faol emas.`);
            autoWipe(ctx, warn.message_id, 5000);
        } catch (e) { console.error(e); }
    });

    // VIDEO TUTUVCHI
    bot.on('video', async (ctx) => {
        try {
            state.queue.push(ctx.message.video.file_id);
            await saveState();
            
            const sStr = String(state.season).padStart(2, '0');
            const eStr = String(state.queue.length).padStart(2, '0');
            
            const sentNotif = await ctx.replyWithHTML(`✅ Video qo'shildi: <b>S${sStr}E${eStr}</b>`);
            autoWipe(ctx, sentNotif.message_id, 5000);
            queueMenuRefresh(ctx, 2000);
        } catch (e) { console.error(e); }
    });

    // MATN TUTUVCHI
    bot.on('text', async (ctx) => {
        try {
            // POSTER QADAM 2: NOMINI QABUL QILISH
            if (waitingFor.type === 'poster_name') {
                waitingFor.poster.name = ctx.message.text;
                waitingFor.type = 'poster_desc';
                
                const keyboard = Markup.inlineKeyboard([[Markup.button.callback('❌ Bekor qilish', 'action_cancel_input')]]);
                const info = await ctx.replyWithHTML(`✅ <b>Nomi olingan! (3/3-qadam)</b>\n\nEndi kino ta'rifini (hikoya va statistikalarni) oddiy yuboravering.\n<i>Bot yuborgan barcha matningizni chiroyli qizil chiziqli (quote) ichiga soladi va oxiriga kanal linkini qo'shib yuklaydi!</i>`, keyboard);
                autoWipe(ctx, info.message_id, 15000);
                return;
            }

            // POSTER QADAM 3: DESCRIPTION VA POST QILISH
            if (waitingFor.type === 'poster_desc') {
                waitingFor.poster.desc = ctx.message.text;
                
                const name = waitingFor.poster.name;
                const desc = waitingFor.poster.desc;
                
                // Siz xohlagan Super Shablon shu yerda avtomat tayyorlanadi:
                const caption = `🎬 <b>${name} — Seriali Uzbek Tilida</b>\n\n<blockquote>${desc}</blockquote>\n\n@CineoraUz 🍿`;

                try {
                    await ctx.telegram.sendPhoto(config.TELEGRAM_CHANNEL_ID, waitingFor.poster.fileId, {
                        caption: caption,
                        parse_mode: 'HTML'
                    });
                    
                    waitingFor.type = null;
                    waitingFor.poster = { fileId: null, name: null, desc: null };

                    const success = await ctx.replyWithHTML(`🎉 <b>Poster muvaffaqiyatli kanalga joylandi!</b>`);
                    autoWipe(ctx, success.message_id, 6000);
                    await sendMenu(ctx);
                } catch (err) {
                    const errorMsg = await ctx.reply(`❌ Xatolik: ${err.message}`);
                    autoWipe(ctx, errorMsg.message_id, 10000);
                }
                return;
            }

            // ODDIY REJIMLAR
            if (!waitingFor.type) {
                const warn = await ctx.replyWithHTML(`⚠️ <b>Xatolik:</b> Matn kiritish rejimi faol emas!`);
                autoWipe(ctx, warn.message_id, 5000);
                await sendMenu(ctx);
                return;
            }
            
            const text = ctx.message.text;

            if (waitingFor.type === 'title') {
                state.title = text;
                const info = await ctx.replyWithHTML(`✅ Nomi yangilandi: <b>${state.title}</b>`);
                autoWipe(ctx, info.message_id, 5000);
            } else if (waitingFor.type === 'season') {
                const parsed = parseInt(text, 10);
                if (isNaN(parsed)) {
                    const err = await ctx.reply(`❌ Noto'g'ri raqam. Qayta yuboring:`);
                    autoWipe(ctx, err.message_id, 5000);
                    return;
                }
                state.season = parsed;
                const info = await ctx.replyWithHTML(`✅ Mavsum yangilandi: <b>${state.season}</b>`);
                autoWipe(ctx, info.message_id, 5000);
            } else if (waitingFor.type === 'season_info') {
                if (text === '/clear') {
                    state.season_info = "";
                    const info = await ctx.replyWithHTML(`🗑 Mavsum izohi tozalandi.`);
                    autoWipe(ctx, info.message_id, 5000);
                } else {
                    state.season_info = text;
                    const info = await ctx.replyWithHTML(`✅ Mavsum izohi saqlandi!`);
                    autoWipe(ctx, info.message_id, 5000);
                }
            } else if (waitingFor.type === 'template') {
                if (text === '/clear') {
                    state.template = "";
                    const info = await ctx.replyWithHTML(`🗑 Shablon tozalandi.`);
                    autoWipe(ctx, info.message_id, 5000);
                } else {
                    state.template = text;
                    const info = await ctx.replyWithHTML(`✅ Shablon saqlandi!`);
                    autoWipe(ctx, info.message_id, 5000);
                }
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
