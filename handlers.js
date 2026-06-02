const { Markup } = require('telegraf');
const { state, saveState, generateCaption } = require('./state');

const OWNER_ID = String(process.env.OWNER_ID);
const TELEGRAM_CHANNEL_ID = process.env.TELEGRAM_CHANNEL_ID;

let waitingFor = { type: null, menuMessageId: null };

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

// Eski menyuni toza o'chirib, har doim eng pastda yangi xabar sifatida chiqarish
const sendMenu = async (ctx) => {
    waitingFor.type = null;
    if (waitingFor.menuMessageId) {
        try {
            await ctx.telegram.deleteMessage(ctx.chat.id, waitingFor.menuMessageId);
        } catch (e) { /* xabar topilmasa xatolikni o'tkazib yuborish */ }
    }
    const sent = await ctx.replyWithHTML(getMenuText(), getMenuKeyboard());
    waitingFor.menuMessageId = sent.message_id;
};

// Bildirishnomalarni 7 soniyadan keyin avtomatik o'chirish yordamchisi
const autoDeleteMessage = (ctx, msgId, delay = 7000) => {
    setTimeout(async () => {
        try {
            await ctx.telegram.deleteMessage(ctx.chat.id, msgId);
        } catch (e) { /* o'chib bo'lgan bo'lsa o'tkazib yuboriladi */ }
    }, delay);
};

const handleInputPrompt = async (ctx, promptText) => {
    waitingFor.type = ctx.callbackQuery ? waitingFor.type : waitingFor.type; 
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
    await handleInputPrompt(ctx, '🎬 <b>Kino yoki Serial nomini yuboring:</b>\n<i>(Masalan: Dark yoki Breaking Bad)</i>');
};

const handleSetSeason = async (ctx) => {
    waitingFor.type = 'season';
    await handleInputPrompt(ctx, '📺 <b>Mavsum raqamini yuboring:</b>\n<i>(Masalan: 1 yoki 5)</i>');
};

const handleSetTemplate = async (ctx) => {
    waitingFor.type = 'template';
    await handleInputPrompt(ctx, '🧾 <b>Video ostiga tushadigan doimiy shablon matnini yuboring:</b>\n<i>(Masalan:</i>\n<code>Video: 1080p | Blu-Ray\nAudio: Uzb, Eng\n@CineoraUz</code><i>)</i>');
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
            return ctx.editMessageText('📋 Navbatda hech qanday video yo\'q.', keyboard);
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
        await ctx.editMessageText('⚠️ <b>Rostdan ham navbatdagi barcha videolarni o\'chirmoqchimisiz?</b>', { parse_mode: 'HTML', ...keyboard });
    }
};

const handlePost = async (ctx) => {
    if (ctx.callbackQuery) {
        if (state.queue.length === 0) {
            return ctx.answerCbQuery('❌ Navbat bo\'sh! Avval video yuboring.', { show_alert: true });
        }
        if (!TELEGRAM_CHANNEL_ID) {
            return ctx.answerCbQuery('❌ TELEGRAM_CHANNEL_ID sozlanmagan!', { show_alert: true });
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
        `1️⃣ <b>Shablonni sozlang:</b> Boshqaruv panelidan foydalanib Nomi, Mavsum va Shablon matnini kiriting.\n` +
        `2️⃣ <b>Videolarni yuboring:</b> Botga videolarni ketma-ketlikda shunchaki yuboring. Nomini keyin o'zgartirsangiz ham kanalga to'g'ri nomi bilan ketadi.\n` +
        `3️⃣ <b>Tekshirish:</b> Navbat ro'yxati yoki Ko'rinish tugmalari orqali tekshiring.\n` +
        `4️⃣ <b>Joylash:</b> Kanalga joylash tugmasini bossangiz bot tartib bilan yuboradi va navbatni avtomat tozalaydi.\n\n` +
        `⚙ <i>Bot faqat hisob egasi uchun ishlaydi. Har qanday bildirishnoma xabarlari 7 soniyada o'chib ketadi. Menyuingiz doimo eng pastda turadi.</i>`;
    
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
        try {
            await sendMenu(ctx);
        } catch (e) { console.error(e); }
    });

    bot.action('confirm_clear', async (ctx) => {
        try {
            state.queue = [];
            await saveState();
            const info = await ctx.replyWithHTML('🗑 Navbat muvaffaqiyatli tozalandi.');
            autoDeleteMessage(ctx, info.message_id);
            await sendMenu(ctx);
        } catch (e) { console.error(e); }
    });

    bot.action('confirm_post', async (ctx) => {
        try {
            await ctx.editMessageText('🚀 Kanalga yuklash boshlandi, iltimos kuting...');
            let successCount = 0;

            for (let i = 0; i < state.queue.length; i++) {
                try {
                    await ctx.telegram.sendVideo(TELEGRAM_CHANNEL_ID, state.queue[i], {
                        caption: generateCaption(i),
                        parse_mode: 'HTML'
                    });
                    successCount++;
                } catch (error) {
                    const errNotif = await ctx.reply(`❌ Xatolik yuz berdi (Qism index ${i}): ${error.message}`);
                    autoDeleteMessage(ctx, errNotif.message_id, 15000);
                    break; 
                }
            }

            if (successCount === state.queue.length && state.queue.length > 0) {
                state.queue = [];
                await saveState();
                const statusNotif = await ctx.replyWithHTML(`✅ Muvaffaqiyatli bajarildi! Jami ${successCount} ta qism kanalga joylandi.`);
                autoDeleteMessage(ctx, statusNotif.message_id);
            } else if (successCount > 0) {
                state.queue = state.queue.slice(successCount);
                await saveState();
                const partialNotif = await ctx.replyWithHTML(`⚠️ Yuklash qisman to'xtadi. ${successCount} ta qism joylandi.`);
                autoDeleteMessage(ctx, partialNotif.message_id);
            }
            await sendMenu(ctx);
        } catch (e) { console.error(e); }
    });

    bot.on('video', async (ctx) => {
        try {
            // Bir vaqtning o'zida yuborilgan videolarni ham xavfsiz qabul qiladi
            state.queue.push(ctx.message.video.file_id);
            await saveState();
            
            const sStr = String(state.season).padStart(2, '0');
            const eStr = String(state.queue.length).padStart(2, '0');
            
            const sentNotif = await ctx.replyWithHTML(`✅ Video navbatga qo'shildi: <b>S${sStr}E${eStr}</b>\nJami navbatda: <b>${state.queue.length} ta</b>`);
            autoDeleteMessage(ctx, sentNotif.message_id);
            
            // Har bitta yangi video qo'shilganda menyuni ham eng pastga tushiramiz
            await sendMenu(ctx);
        } catch (e) { console.error(e); }
    });

    bot.on('text', async (ctx, next) => {
        try {
            if (!waitingFor.type) {
                const warn = await ctx.replyWithHTML('⚠️ Noma\'lum matn. Iltimos quyidagi boshqaruv panelidan foydalaning yoki /start bosing.');
                autoDeleteMessage(ctx, warn.message_id);
                return;
            }
            const text = ctx.message.text;

            if (waitingFor.type === 'title') {
                state.title = text;
                const info = await ctx.replyWithHTML(`✅ Kino/Serial nomi yangilandi: <b>${state.title}</b>`);
                autoDeleteMessage(ctx, info.message_id);
            } else if (waitingFor.type === 'season') {
                const parsed = parseInt(text, 10);
                if (isNaN(parsed)) {
                    const err = await ctx.reply('❌ Noto\'g\'ri raqam. Mavsum raqamini qayta yuboring:');
                    autoDeleteMessage(ctx, err.message_id);
                    return;
                }
                state.season = parsed;
                const info = await ctx.replyWithHTML(`✅ Mavsum raqami yangilandi: <b>${state.season}</b>`);
                autoDeleteMessage(ctx, info.message_id);
            } else if (waitingFor.type === 'template') {
                state.template = text;
                const info = await ctx.replyWithHTML(`✅ Doimiy shablon matni muvaffaqiyatli saqlandi.`);
                autoDeleteMessage(ctx, info.message_id);
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
