const { Markup } = require('telegraf');
const { state, saveState, generateCaption } = require('./state');
const config = require('./config');

let waitingFor = { type: null, menuMessageId: null };
let menuDebounceTimer = null;

const getMenuText = () => {
    const s = String(state.season).padStart(2, '0');
    const sampleCaption = `<b>${state.title}</b>\n<b>S${s}E01</b>` + 
        (state.template ? `\n\n${state.template}` : '');

    return `🎛 <b>Boshqaruv Paneli</b>\n\n` +
           `📝 <b>Joriy shablon ko'rinishi (Preview):</b>\n` +
           `----------------------------------------\n` +
           `${sampleCaption}\n` +
           `----------------------------------------\n\n` +
           `📊 <b>Statistika:</b>\n` +
           `• Mavsum raqami: <code>${state.season}</code>\n` +
           `• Navbatdagi videolar: <code>${state.queue.length} ta</code>`;
};

const getMenuKeyboard = () => {
    return Markup.inlineKeyboard([
        [Markup.button.callback('🎬 Nomi', 'action_settitle'), Markup.button.callback('📺 Mavsum', 'action_setseason')],
        [Markup.button.callback('🧾 Doimiy Shablon (Template)', 'action_settemplate')],
        [Markup.button.callback('📋 Navbat Ro\'yxati', 'action_list'), Markup.button.callback('👁 Ko\'rinish', 'action_preview')],
        [Markup.button.callback('🗑 Navbatni Tozalash', 'action_clear')],
        [Markup.button.callback('🚀 Kanalga Joylash', 'action_post')]
    ]);
};

const sendMenu = async (ctx) => {
    waitingFor.type = null;
    const chatId = ctx.chat.id;
    
    if (waitingFor.menuMessageId) {
        try {
            await ctx.telegram.deleteMessage(chatId, waitingFor.menuMessageId);
        } catch (e) {}
    }
    
    try {
        const sent = await ctx.telegram.sendMessage(chatId, getMenuText(), {
            parse_mode: 'HTML',
            ...getMenuKeyboard()
        });
        waitingFor.menuMessageId = sent.message_id;
    } catch (err) {
        console.error("Menyu yuborishda xatolik:", err);
    }
};

const queueMenuRefresh = (ctx, delay = 2000) => {
    if (menuDebounceTimer) clearTimeout(menuDebounceTimer);
    menuDebounceTimer = setTimeout(async () => {
        await sendMenu(ctx);
    }, delay);
};

// Faqat bot yuborgan vaqtinchalik xabarni o'chirish (Foydalanuvchi xabari saqlanadi)
const autoWipe = (ctx, botMsgId, delay = 5000) => {
    setTimeout(async () => {
        try { await ctx.telegram.deleteMessage(ctx.chat.id, botMsgId); } catch (e) {}
    }, delay);
};

const handleInputPrompt = async (ctx, promptText) => {
    const keyboard = Markup.inlineKeyboard([[Markup.button.callback('❌ Bekor qilish', 'action_cancel_input')]]);
    if (ctx.callbackQuery) {
        await ctx.editMessageText(promptText, { parse_mode: 'HTML', ...keyboard });
    } else {
        const sent = await ctx.replyWithHTML(promptText, keyboard);
        if (waitingFor.menuMessageId) {
            try { await ctx.telegram.deleteMessage(ctx.chat.id, waitingFor.menuMessageId); } catch(e){}
        }
        waitingFor.menuMessageId = sent.message_id;
    }
};

const handleSetTitle = async (ctx) => {
    waitingFor.type = 'title';
    await handleInputPrompt(ctx, `🎬 <b>Kino yoki Serial nomini yuboring:</b>\n<i>(Masalan: Dark yoki Breaking Bad)</i>`);
};

const handleSetSeason = async (ctx) => {
    waitingFor.type = 'season';
    await handleInputPrompt(ctx, `📺 <b>Mavsum raqamini yuboring:</b>\n<i>(Masalan: 1 yoki 5)</i>`);
};

const handleSetTemplate = async (ctx) => {
    waitingFor.type = 'template';
    await handleInputPrompt(ctx, `🧾 <b>Video ostiga tushadigan doimiy shablon matnini yuboring:</b>\n<i>(Masalan:</i>\n<code>Video: 1080p | Blu-Ray\nAudio: Uzb, Eng\n@CineoraUz</code><i>)</i>`);
};

const handlePreview = async (ctx) => {
    if (ctx.callbackQuery) {
        const nextIndex = state.queue.length;
        const previewCaption = generateCaption(nextIndex);
        const keyboard = Markup.inlineKeyboard([[Markup.button.callback('⬅️ Orqaga', 'action_back_to_menu')]]);
        await ctx.editMessageText(`👁 <b>Navbatdagi qism ko'rinishi (E${String(nextIndex + 1).padStart(2, '0')}):</b>\n\n${previewCaption}`, { parse_mode: 'HTML', ...keyboard });
    }
};

const handleList = async (ctx) => {
    if (ctx.callbackQuery) {
        const keyboard = Markup.inlineKeyboard([[Markup.button.callback('⬅️ Orqaga', 'action_back_to_menu')]]);
        if (state.queue.length === 0) {
            return ctx.editMessageText(`📋 Navbatda hech qanday video yo'q.`, keyboard);
        }
        const listText = state.queue.map((_, i) => `• E${String(i + 1).padStart(2, '0')}`).join('\n');
        await ctx.editMessageText(`📋 <b>Navbatdagi qismlar ro'yxati:</b>\n\n${listText}`, { parse_mode: 'HTML', ...keyboard });
    }
};

const handleClear = async (ctx) => {
    if (ctx.callbackQuery) {
        const keyboard = Markup.inlineKeyboard([
            [Markup.button.callback('🗑 HA, TOZALANSIN', 'confirm_clear'), Markup.button.callback('❌ BEKOR QILISH', 'action_back_to_menu')]
        ]);
        await ctx.editMessageText(`⚠️ <b>Rostdan ham navbatdagi barcha videolarni o'chirmoqchimisiz?</b>`, { parse_mode: 'HTML', ...keyboard });
    }
};

const handlePost = async (ctx) => {
    if (ctx.callbackQuery) {
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
    }
};

const handleHelp = async (ctx) => {
    if (waitingFor.menuMessageId) {
        try { await ctx.telegram.deleteMessage(ctx.chat.id, waitingFor.menuMessageId); } catch(e){}
        waitingFor.menuMessageId = null;
    }
    const helpText = `📖 <b>Botdan foydalanish qo'llanmasi:</b>\n\n` +
        `1️⃣ <b>Sarlavha/Shablon kiritish:</b> Avval panelda mos tugmani bosing, keyin matn yuboring.\n` +
        `2️⃣ <b>Videolarni yuklash:</b> Istalgancha videolarni guruhlab bittada yuboring, bot hammasini qabul qilib, menyuni eng pastga chiroyli tushiradi.`;
    
    const sent = await ctx.replyWithHTML(helpText, Markup.inlineKeyboard([[Markup.button.callback('⬅️ Menyoga qaytish', 'action_back_to_menu')]]));
    waitingFor.menuMessageId = sent.message_id;
};

const registerHandlers = (bot) => {
    bot.command(['start', 'menu'], sendMenu);
    bot.command('help', handleHelp);

    bot.action('action_settitle', handleSetTitle);
    bot.action('action_setseason', handleSetSeason);
    bot.action('action_settemplate', handleSetTemplate);
    bot.action('action_preview', handlePreview);
    bot.action('action_list', handleList);
    bot.action('action_clear', handleClear);
    bot.action('action_post', handlePost);

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

    bot.on('video', async (ctx) => {
        try {
            state.queue.push(ctx.message.video.file_id);
            await saveState();
            
            const sStr = String(state.season).padStart(2, '0');
            const eStr = String(state.queue.length).padStart(2, '0');
            
            const sentNotif = await ctx.replyWithHTML(`✅ Video qo'shildi: <b>S${sStr}E${eStr}</b>`);
            // Faqat bot bildirishnomasini o'chiramiz, video chatda qoladi
            autoWipe(ctx, sentNotif.message_id, 5000);
            
            queueMenuRefresh(ctx, 2000);
        } catch (e) { console.error(e); }
    });

    bot.on('text', async (ctx, next) => {
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
};

module.exports = { registerHandlers };
