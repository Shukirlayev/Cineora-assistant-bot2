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

const sendMenu = async (ctx) => {
    waitingFor.type = null;
    waitingFor.menuMessageId = null;
    await ctx.replyWithHTML(getMenuText(), getMenuKeyboard());
};

const updateMenuOrReply = async (ctx) => {
    waitingFor.type = null;
    if (waitingFor.menuMessageId) {
        try {
            await ctx.telegram.editMessageText(ctx.chat.id, waitingFor.menuMessageId, null, getMenuText(), {
                parse_mode: 'HTML',
                ...getMenuKeyboard()
            });
            waitingFor.menuMessageId = null;
            return;
        } catch (e) { /* tahrirlashda xato bo'lsa pastga tushadi */ }
    }
    await sendMenu(ctx);
};

const handleInputPrompt = async (ctx, promptText) => {
    if (ctx.callbackQuery) {
        waitingFor.menuMessageId = ctx.callbackQuery.message.message_id;
        const keyboard = Markup.inlineKeyboard([[Markup.button.callback('❌ Bekor qilish', 'action_cancel_input')]]);
        await ctx.editMessageText(promptText, { parse_mode: 'HTML', ...keyboard });
    } else {
        await ctx.replyWithHTML(promptText);
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
            [Markup.button.callback('🚀 HA, KANALGA JOYLANMASIN', 'confirm_post'), Markup.button.callback('❌ BEKOR QILISH', 'action_back_to_menu')]
        ]);

        const confirmationText = `🚀 <b>Kanalga jami ${state.queue.length} ta video quyidagi ko'rinishda joylanadi:</b>\n\n` +
            `<b>[Birinchi qism namuna]:</b>\n${firstPreview}\n` +
            `----------------------------------------\n` +
            `<b>[Oxirgi qism namuna]:</b>\n${lastPreview}\n\n` +
            `⚠️ Tasdiqlaysizmi?`;

        await ctx.editMessageText(confirmationText, { parse_mode: 'HTML', ...keyboard });
    }
};

const handleHelp = async (ctx) => {
    const helpText = `📖 <b>Botdan foydalanish qo'llanmasi:</b>\n\n` +
        `1️⃣ <b>Shablonni sozlang:</b> Boshqaruv panelidan foydalanib 🎬 Nomi, 📺 Mavsum va 🧾 Shablon matnini kiriting.\n` +
        `2️⃣ <b>Videolarni yuboring:</b> Botga videolarni ketma-ketlikda shunchaki yuboring. Bot ularni avtomatik navbatga oladi va qism raqamini belgilaydi.\n` +
        `3️⃣ <b>Tekshirish:</b> 📋 Navbat yoki 👁 Ko'rinish tugmalari orqali xabarlarni tekshiring.\n` +
        `4️⃣ <b>Joylash:</b> 🚀 Kanalga joylash tugmasini bossangiz bot hammasini kanalga chiroyli qilib tartib bilan yuboradi va navbatni tozalaydi.\n\n` +
        `⚙ <i>Bot faqat hisob egasi uchun ishlaydi, boshqalarga javob bermaydi.</i>`;
    await ctx.replyWithHTML(helpText);
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
            waitingFor.type = null;
            waitingFor.menuMessageId = null;
            await ctx.editMessageText(getMenuText(), { parse_mode: 'HTML', ...getMenuKeyboard() });
        } catch (e) { await sendMenu(ctx); }
    });

    bot.action('confirm_clear', async (ctx) => {
        try {
            state.queue = [];
            await saveState();
            await ctx.editMessageText('🗑 Navbat muvaffaqiyatli tozalandi.');
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
                    await ctx.reply(`❌ Xatolik yuz berdi (Qism index ${i}): ${error.message}`);
                    break; 
                }
            }

            if (successCount === state.queue.length && state.queue.length > 0) {
                state.queue = [];
                await saveState();
                await ctx.reply(`✅ Muvaffaqiyatli bajarildi! Jami ${successCount} ta qism kanalga joylandi va navbat tozalandi.`);
            } else if (successCount > 0) {
                state.queue = state.queue.slice(successCount);
                await saveState();
                await ctx.reply(`⚠️ Yuklash qisman to'xtadi. ${successCount} ta qism joylandi. Qolgan qismlar navbatda saqlab qolindi.`);
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
            await ctx.replyWithHTML(`✅ Video navbatga qo'shildi: <b>S${sStr}E${eStr}</b>\nJami navbatda: <b>${state.queue.length} ta</b>`);
        } catch (e) { console.error(e); }
    });

    bot.on('text', async (ctx, next) => {
        try {
            if (!waitingFor.type) {
                return await ctx.replyWithHTML('⚠️ Noma\'lum matn. Iltimos quyidagi boshqaruv panelidan foydalaning yoki /start bosing.');
            }
            const text = ctx.message.text;

            if (waitingFor.type === 'title') {
                state.title = text;
                await ctx.replyWithHTML(`✅ Kino/Serial nomi yangilandi: <b>${state.title}</b>`);
            } else if (waitingFor.type === 'season') {
                const parsed = parseInt(text, 10);
                if (isNaN(parsed)) return ctx.reply('❌ Noto\'g\'ri raqam. Mavsum raqamini qayta yuboring:');
                state.season = parsed;
                await ctx.replyWithHTML(`✅ Mavsum raqami yangilandi: <b>${state.season}</b>`);
            } else if (waitingFor.type === 'template') {
                state.template = text;
                await ctx.replyWithHTML(`✅ Doimiy shablon matni muvaffaqiyatli saqlandi.`);
            }

            await saveState();
            await updateMenuOrReply(ctx);
        } catch (e) {
            console.error(e);
            waitingFor.type = null;
            await sendMenu(ctx);
        }
    });
};

module.exports = { registerHandlers };
