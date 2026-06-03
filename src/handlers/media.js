const { state, saveState, getWorkspace } = require('../services/storage');
const config = require('../config');
const { getSession, autoWipe, queueMenuRefresh, sendMenu } = require('../utils/ui');
const { Markup } = require('telegraf');

// Video kiritish konveyer qismi (2-muammo yechimi: helper holatiga olindi)
async function handleVideoInput(ctx, fileId) {
    const userId = String(ctx.from.id);
    const ws = getWorkspace(userId);
    
    const currentEps = ws.queue.filter(v => v.season === ws.season).length + 1;
    ws.queue.push({
        fileId: fileId,
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
}

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

    // 2-MUAMMO YECHIMI: .mkv hujjat ko'rinishidagi o'ta sifatli videolarni qabul qilish
    bot.on('document', async (ctx) => {
        try {
            const doc = ctx.message.document;
            const mime = doc.mime_type || '';
            const name = doc.file_name || '';
            
            if (mime.startsWith('video/') || name.endsWith('.mkv') || name.endsWith('.mp4') || name.endsWith('.avi') || name.endsWith('.mov')) {
                return await handleVideoInput(ctx, doc.file_id);
            }
            autoWipe(ctx, (await ctx.reply(`⚠️ Bu fayl video formatida emas.`)).message_id, 5000);
        } catch (e) { console.error(e); }
    });

    bot.on('video', async (ctx) => {
        try {
            await handleVideoInput(ctx, ctx.message.video.file_id);
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
            
            // 3-MUAMMO YECHIMI: Posterni kanalga otishdan avval JONLI PREVIEW va tasdiq oynasi
            if (session.waitingFor.type === 'poster_desc') {
                if (session.waitingFor.promptMessageId) { try { await ctx.telegram.deleteMessage(ctx.chat.id, session.waitingFor.promptMessageId); } catch(e){} }
                
                const caption = `🎬 <b>${session.waitingFor.poster.name} — Seriali Uzbek Tilida</b>\n\n<blockquote>${text}</blockquote>\n\n@CineoraUz 🍿`;
                session.waitingFor.poster.finalCaption = caption;
                session.waitingFor.type = 'poster_confirm';
                
                // Admin chatiga rasmni o'zini tekst bilan chiqarib beramiz! (Apple darajasidagi UX)
                const previewMsg = await ctx.replyWithPhoto(session.waitingFor.poster.fileId, {
                    caption: `👁 <b>POSTER PREVIEW (Tasdiqlash qadami):</b>\n\n${caption}\n\n⚠️ Kanalga joylashni tasdiqlaysizmi?`,
                    parse_mode: 'HTML',
                    ...Markup.inlineKeyboard([
                        [Markup.button.callback('🚀 TASDIQLASH & JOYLASH', 'confirm_poster_send')],
                        [Markup.button.callback('❌ BEKOR QILISH', 'action_cancel_input')]
                    ])
                });
                session.waitingFor.promptMessageId = previewMsg.message_id;
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
                ws.season_info = text === '/clear' ? '' : text;
                autoWipe(ctx, (await ctx.replyWithHTML(`✅ Izoh yangilandi.`)).message_id, 5000);
            }

            await saveState();
            await sendMenu(ctx);
        } catch (e) { console.error(e); await sendMenu(ctx); }
    });
}

module.exports = { initMedia };
