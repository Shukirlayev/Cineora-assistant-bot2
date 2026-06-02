const { Markup } = require('telegraf');
const { state, saveState, generateCaption } = require('./state');

const OWNER_ID = String(process.env.OWNER_ID);
const TELEGRAM_CHANNEL_ID = process.env.TELEGRAM_CHANNEL_ID;

let waitingFor = { type: null };

const sendMenu = async (ctx) => {
    waitingFor.type = null;
    const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('🎬 Title', 'action_settitle'), Markup.button.callback('📺 Season', 'action_setseason')],
        [Markup.button.callback('🧾 Template', 'action_settemplate')],
        [Markup.button.callback('📋 List', 'action_list'), Markup.button.callback('📊 Status', 'action_status')],
        [Markup.button.callback('👁 Preview', 'action_preview'), Markup.button.callback('🗑 Clear', 'action_clear')],
        [Markup.button.callback('🚀 Post', 'action_post')]
    ]);
    await ctx.reply('🎛 **Main Menu**\nSelect an action:', keyboard);
};

const handleSetTitle = async (ctx) => {
    waitingFor.type = 'title';
    await ctx.reply('Send me the new Title:');
};

const handleSetSeason = async (ctx) => {
    waitingFor.type = 'season';
    await ctx.reply('Send me the new Season number:');
};

const handleSetTemplate = async (ctx) => {
    waitingFor.type = 'template';
    await ctx.reply('Send me the new Caption Template:');
};

const handleStatus = async (ctx) => {
    const text = `📊 **Status**\n\n🎬 Title: ${state.title}\n📺 Season: ${state.season}\n📦 Queue length: ${state.queue.length} video(s)`;
    await ctx.reply(text);
};

const handleList = async (ctx) => {
    if (state.queue.length === 0) return ctx.reply('The queue is empty.');
    const listText = state.queue.map((_, i) => `E${String(i + 1).padStart(2, '0')}`).join('\n');
    await ctx.reply(`📋 **Queue List:**\n${listText}`);
};

const handlePreview = async (ctx) => {
    const nextIndex = state.queue.length;
    const previewCaption = generateCaption(nextIndex);
    await ctx.reply(`👁 **Preview (Episode ${nextIndex + 1}):**\n\n${previewCaption}`);
};

const handleClear = async (ctx) => {
    const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('YES CLEAR', 'confirm_clear'), Markup.button.callback('CANCEL', 'cancel')]
    ]);
    await ctx.reply('Are you sure you want to clear the entire queue?', keyboard);
};

const handlePost = async (ctx) => {
    if (state.queue.length === 0) return ctx.reply('The queue is empty. Nothing to post.');
    if (!TELEGRAM_CHANNEL_ID) return ctx.reply('TELEGRAM_CHANNEL_ID is not configured.');
    
    const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('CONFIRM POST', 'confirm_post'), Markup.button.callback('CANCEL', 'cancel')]
    ]);
    await ctx.reply(`Are you sure you want to post ${state.queue.length} video(s)?`, keyboard);
};

const registerHandlers = (bot) => {
    bot.command(['start', 'menu'], sendMenu);
    bot.command('settitle', handleSetTitle);
    bot.command('setseason', handleSetSeason);
    bot.command('settemplate', handleSetTemplate);
    bot.command('status', handleStatus);
    bot.command('list', handleList);
    bot.command('preview', handlePreview);
    bot.command('clear', handleClear);
    bot.command('post', handlePost);

    bot.action('action_settitle', handleSetTitle);
    bot.action('action_setseason', handleSetSeason);
    bot.action('action_settemplate', handleSetTemplate);
    bot.action('action_status', handleStatus);
    bot.action('action_list', handleList);
    bot.action('action_preview', handlePreview);
    bot.action('action_clear', handleClear);
    bot.action('action_post', handlePost);

    bot.action('cancel', async (ctx) => {
        try {
            await ctx.editMessageText('Action cancelled.');
            await sendMenu(ctx);
        } catch (e) { console.error(e); }
    });

    bot.action('confirm_clear', async (ctx) => {
        try {
            state.queue = [];
            await saveState();
            await ctx.editMessageText('🗑 Queue has been cleared.');
        } catch (e) { console.error(e); }
    });

    bot.action('confirm_post', async (ctx) => {
        try {
            await ctx.editMessageText('🚀 Posting in progress...');
            let successCount = 0;

            for (let i = 0; i < state.queue.length; i++) {
                try {
                    await ctx.telegram.sendVideo(TELEGRAM_CHANNEL_ID, state.queue[i], {
                        caption: generateCaption(i)
                    });
                    successCount++;
                } catch (error) {
                    await ctx.reply(`❌ Failed index ${i}: ${error.message}`);
                    break; 
                }
            }

            if (successCount === state.queue.length && state.queue.length > 0) {
                state.queue = [];
                await saveState();
                await ctx.reply(`✅ Posted ${successCount} video(s). Queue cleared.`);
            } else if (successCount > 0) {
                state.queue = state.queue.slice(successCount);
                await saveState();
                await ctx.reply(`⚠️ Partially posted ${successCount} video(s).`);
            }
        } catch (e) { console.error(e); }
    });

    bot.on('video', async (ctx) => {
        try {
            state.queue.push(ctx.message.video.file_id);
            await saveState();
            const sStr = String(state.season).padStart(2, '0');
            const eStr = String(state.queue.length).padStart(2, '0');
            await ctx.reply(`✅ Video added: S${sStr}E${eStr}\nTotal: ${state.queue.length}`);
        } catch (e) { console.error(e); }
    });

    bot.on('text', async (ctx, next) => {
        try {
            if (!waitingFor.type) {
                return await ctx.reply('⚠️ Noma\'lum matn. Iltimos menyudan foydalaning yoki /start bosing.');
            }
            const text = ctx.message.text;

            if (waitingFor.type === 'title') {
                state.title = text;
                await ctx.reply(`✅ Title updated to:\n${state.title}`);
            } else if (waitingFor.type === 'season') {
                const parsed = parseInt(text, 10);
                if (isNaN(parsed)) return ctx.reply('❌ Invalid number. Send season again:');
                state.season = parsed;
                await ctx.reply(`✅ Season updated to:\n${state.season}`);
            } else if (waitingFor.type === 'template') {
                state.template = text;
                await ctx.reply(`✅ Template updated.`);
            }

            waitingFor.type = null;
            await saveState();
            await sendMenu(ctx);
        } catch (e) {
            console.error(e);
            waitingFor.type = null;
        }
    });
};

module.exports = { registerHandlers };
