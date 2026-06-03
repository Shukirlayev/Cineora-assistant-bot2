const { state, saveState } = require('../services/storage');
const { waitingFor, autoWipe, queueMenuRefresh, sendMenu } = require('../utils/ui');

function initMedia(bot) {
    bot.on('video', async (ctx) => {
        try {
            state.queue.push(ctx.message.video.file_id);
            await saveState();
            
            const sStr = String(state.season).padStart(2, '0');
            const eStr = String(state.queue.length).padStart(2, '0');
            
            const sentNotif = await ctx.replyWithHTML(`✅ Video qo'shildi: <b>S${sStr}E${eStr}</b>`);
            // Faqat bot xabarini o'chiramiz, video chatda qoladi
            autoWipe(ctx, sentNotif.message_id, 5000);
            
            queueMenuRefresh(ctx, 2000);
        } catch (e) { console.error(e); }
    });

    bot.on('text', async (ctx) => {
        try {
            if (!waitingFor.type) {
                const warn = await ctx.replyWithHTML(`⚠️ <b>Xatolik:</b> Matn kiritish rejimi faol emas! Nomi yoki Shablonni o'zgartirish uchun avval quyidagi menyudan kerakli tugmani bosing.`);
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
            } else if (waitingFor.type === 'template') {
                state.template = text;
                const info = await ctx.replyWithHTML(`✅ Doimiy shablon matni muvaffaqiyatli saqlandi.`);
                autoWipe(ctx, info.message_id, 5000);
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
