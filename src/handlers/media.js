const { state, saveState } = require('../services/storage');
const config = require('../config');
const { waitingFor, autoWipe, queueMenuRefresh, sendMenu } = require('../utils/ui');

function initMedia(bot) {
    // Rasmlarni tutuvchi yangi xizmat
    bot.on('photo', async (ctx) => {
        try {
            if (waitingFor.type === 'poster_image') {
                const photoArray = ctx.message.photo;
                // Eng yuqori sifatli rasmni olamiz
                waitingFor.posterFileId = photoArray[photoArray.length - 1].file_id;
                waitingFor.type = 'poster_text';

                const info = await ctx.replyWithHTML(`✅ <b>Rasm saqlandi!</b>\n\nEndi ushbu rasm tagiga tushadigan <b>to'liq matnni</b> (description) yuboring.\n\n<i>Qanday qilib bold, link yoki blockquote qilib formatlab yuborsangiz, bot hech narsasini buzmasdan xuddi shunday qilib kanalga joylaydi.</i>`);
                autoWipe(ctx, info.message_id, ctx.message.message_id, 10000);
                return;
            }
            // Agar poster rejimidan tashqarida rasm kelsa
            const warn = await ctx.reply(`⚠️ Rasm qabul qilish rejimi faol emas.`);
            autoWipe(ctx, warn.message_id, ctx.message.message_id, 5000);
        } catch (e) { console.error(e); }
    });

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

    bot.on('text', async (ctx) => {
        try {
            // Agar Poster rejimi matn kutyotgan bo'lsa
            if (waitingFor.type === 'poster_text') {
                try {
                    // Telegramning o'z formatlashlarini (Entities) to'liq saqlab qoladigan qator
                    await ctx.telegram.sendPhoto(config.TELEGRAM_CHANNEL_ID, waitingFor.posterFileId, {
                        caption: ctx.message.text,
                        caption_entities: ctx.message.entities 
                    });
                    
                    // Saqlab bo'lgach xotirani tozalash
                    waitingFor.type = null;
                    waitingFor.posterFileId = null;

                    const success = await ctx.replyWithHTML(`🎉 <b>Poster muvaffaqiyatli joylandi!</b>`);
                    autoWipe(ctx, success.message_id, ctx.message.message_id, 5000);
                    await sendMenu(ctx);
                } catch (err) {
                    const errorMsg = await ctx.reply(`❌ Xatolik: ${err.message}`);
                    autoWipe(ctx, errorMsg.message_id, null, 10000);
                }
                return;
            }

            // Oddiy matn rejimlari
            if (!waitingFor.type) {
                const warn = await ctx.replyWithHTML(`⚠️ <b>Xatolik:</b> Matn kiritish rejimi faol emas! Nomi yoki Shablonni o'zgartirish uchun avval menyudan kerakli tugmani bosing.`);
                autoWipe(ctx, warn.message_id, 6000);
                await sendMenu(ctx);
                return;
            }
            const text = ctx.message.text;

            if (waitingFor.type === 'title') {
                state.title = text;
                const info = await ctx.replyWithHTML(`✅ Kino/Serial nomi yangilandi: <b>${state.title}</b>`);
                autoWipe(ctx, info.message_id, 5000);
            } else if (waitingFor.type === 'season') {
                const parsed = parseInt(text, 10);
                if (isNaN(parsed)) {
                    const err = await ctx.reply(`❌ Noto'g'ri raqam. Mavsum raqamini qayta yuboring:`);
                    autoWipe(ctx, err.message_id, 5000);
                    return;
                }
                state.season = parsed;
                const info = await ctx.replyWithHTML(`✅ Mavsum raqami yangilandi: <b>${state.season}</b>`);
                autoWipe(ctx, info.message_id, 5000);
            } else if (waitingFor.type === 'season_info') {
                // Agar foydalanuvchi /clear yozsa o'chirib yuboramiz
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
                    const info = await ctx.replyWithHTML(`🗑 Doimiy shablon tozalandi.`);
                    autoWipe(ctx, info.message_id, 5000);
                } else {
                    state.template = text;
                    const info = await ctx.replyWithHTML(`✅ Doimiy shablon matni saqlandi!`);
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
