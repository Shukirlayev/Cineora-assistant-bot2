const { state, saveState, getWorkspace } = require('../services/storage');
const config = require('../config');
const { getSession, autoWipe, queueMenuRefresh, sendMenu } = require('../utils/ui');
const { Markup } = require('telegraf');

function initMedia(bot) {
    bot.on('photo', async (ctx) => {
        try {
            const userId = String(ctx.from.id);
            const session = getSession(userId);
            
            if (session.waitingFor.type === 'poster_image') {
                session.waitingFor.poster.fileId = ctx.message.photo[ctx.message.photo.length - 1].file_id;
                session.waitingFor.type = 'poster_name';
                const info = await ctx.replyWithHTML(`✅ <b>Rasm saqlandi! (2/3)</b>\nNomini yuboring:`, Markup.inlineKeyboard([[Markup.button.callback('❌ Bekor qilish', 'action_cancel_input')]]));
                session.waitingFor.promptMessageId = info.message_id; 
                return;
            }
            autoWipe(ctx, (await ctx.reply(`⚠️ Rasm qabul qilish rejimi faol emas.`)).message_id, 5000);
        } catch (e) { console.error(e); }
    });

    bot.on('video', async (ctx) => {
        try {
            const userId = String(ctx.from.id);
            const ws = getWorkspace(userId);
            
            const currentEps = ws.queue.filter(v => v.season === ws.season).length + 1;
            ws.queue.push({
                fileId: ctx.message.video.file_id,
                mode: ws.mode,
                title: ws.title,
                season: ws.season,
                episode: currentEps,
                season_info: ws.season_info,
                template: ws.template
            });
            await saveState();
            
            const replyTxt = ws.mode === 'serial' ? `✅ S${String(ws.season).padStart(2, '0')}E${String(currentEps).padStart(2, '0')} tayyor.` : `✅ Kino videosi qabul qilindi.`;
            autoWipe(ctx, (await ctx.replyWithHTML(replyTxt)).message_id, 5000);
            queueMenuRefresh(ctx, 2000);
        } catch (e) { console.error(e); }
    });

    bot.on('text', async (ctx) => {
        try {
            const userId = String(ctx.from.id);
            const session = getSession(userId);
            const ws = getWorkspace(userId);
            const text = ctx.message.text;

            if (session.waitingFor.type === 'add_admin') {
                if (!state.admins.includes(text)) state.admins.push(text);
                await saveState();
                autoWipe(ctx, (await ctx.replyWithHTML(`✅ <b>${text}</b> admin etib tayinlandi.`)).message_id, 5000);
                await sendMenu(ctx);
                return;
            }
            if (session.waitingFor.type === 'del_admin') {
                state.admins = state.admins.filter(id => id !== text);
                await saveState();
                autoWipe(ctx, (await ctx.replyWithHTML(`🗑 <b>${text}</b> o'chirildi.`)).message_id, 5000);
                await sendMenu(ctx);
                return;
            }

            if (session.waitingFor.type === 'template_name') {
                session.waitingFor.tempTemplateName = text;
                session.waitingFor.type = 'template_text';
                if (session.waitingFor.promptMessageId) { try { await ctx.telegram.deleteMessage(ctx.chat.id, session.waitingFor.promptMessageId); } catch(e){} }
                const info = await ctx.replyWithHTML(`🏷 <b>"${text}"</b> shabloni uchun matnni yuboring:`, Markup.inlineKeyboard([[Markup.button.callback('❌ Bekor qilish', 'action_cancel_input')]]));
                session.waitingFor.promptMessageId = info.message_id;
                return;
            }
            if (session.waitingFor.type === 'template_text') {
                state.saved_templates.push({ name: session.waitingFor.tempTemplateName, text: text });
                await saveState();
                autoWipe(ctx, (await ctx.replyWithHTML(`✅ <b>Shablon saqlandi!</b>`)).message_id, 5000);
                await sendMenu(ctx);
                return;
            }

            if (session.waitingFor.type === 'poster_name') {
                session.waitingFor.poster.name = text;
                session.waitingFor.type = 'poster_desc';
                if (session.waitingFor.promptMessageId) { try { await ctx.telegram.deleteMessage(ctx.chat.id, session.waitingFor.promptMessageId); } catch(e){} }
                const info = await ctx.replyWithHTML(`✅ <b>Nomi olingan! (3/3)</b>\nTa'rifini yuboring:`, Markup.inlineKeyboard([[Markup.button.callback('❌ Bekor qilish', 'action_cancel_input')]]));
                session.waitingFor.promptMessageId = info.message_id;
                return;
            }
            if (session.waitingFor.type === 'poster_desc') {
                if (session.waitingFor.promptMessageId) { try { await ctx.telegram.deleteMessage(ctx.chat.id, session.waitingFor.promptMessageId); } catch(e){} }
                const caption = `🎬 <b>${session.waitingFor.poster.name} — Seriali Uzbek Tilida</b>\n\n<blockquote>${text}</blockquote>\n\n@CineoraUz 🍿`;
                try {
                    await ctx.telegram.sendPhoto(config.TELEGRAM_CHANNEL_ID, session.waitingFor.poster.fileId, { caption: caption, parse_mode: 'HTML' });
                    
                    state.stats.total_posts += 1; 
                    // Poster ham statistikaga tushadi
                    state.stats.history.unshift({
                        type: 'poster',
                        title: session.waitingFor.poster.name,
                        admin: userId,
                        date: new Date().toLocaleString('uz-UZ', { timeZone: 'Asia/Tashkent', hour12: false })
                    });
                    if (state.stats.history.length > 50) state.stats.history.pop();

                    await saveState();
                    session.waitingFor.type = null;
                    autoWipe(ctx, (await ctx.replyWithHTML(`🎉 <b>Poster kanalga joylandi!</b>`)).message_id, 6000);
                    await sendMenu(ctx);
                } catch (err) {
                    autoWipe(ctx, (await ctx.reply(`❌ Xato: ${err.message}`)).message_id, 10000);
                }
                return;
            }

            if (!session.waitingFor.type) {
                autoWipe(ctx, (await ctx.replyWithHTML(`⚠️ Matn kiritish rejimi faol emas!`)).message_id, 5000);
                await sendMenu(ctx);
                return;
            }

            if (session.waitingFor.type === 'title') {
                ws.title = text;
                autoWipe(ctx, (await ctx.replyWithHTML(`✅ Nomi yangilandi.`)).message_id, 5000);
            } else if (session.waitingFor.type === 'season') {
                const parsed = parseInt(text, 10);
                if (isNaN(parsed)) return autoWipe(ctx, (await ctx.reply(`❌ Noto'g'ri raqam.`)).message_id, 5000);
                ws.season = parsed;
                autoWipe(ctx, (await ctx.replyWithHTML(`✅ Mavsum yangilandi.`)).message_id, 5000);
            } else if (session.waitingFor.type === 'season_info') {
                ws.season_info = text === '/clear' ? "" : text;
                autoWipe(ctx, (await ctx.replyWithHTML(`✅ Izoh yangilandi.`)).message_id, 5000);
            }

            await saveState();
            await sendMenu(ctx);
        } catch (e) { console.error(e); await sendMenu(ctx); }
    });
}

module.exports = { initMedia };
