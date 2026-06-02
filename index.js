require('dotenv').config();
const { Telegraf, Markup } = require('telegraf');
const fs = require('fs').promises;
const path = require('path');

const BOT_TOKEN = process.env.BOT_TOKEN;
const OWNER_ID = String(process.env.OWNER_ID);
const TELEGRAM_CHANNEL_ID = process.env.TELEGRAM_CHANNEL_ID;
const DATA_FILE = path.join(__dirname, 'data.json');

const bot = new Telegraf(BOT_TOKEN);

const DEFAULT_STATE = {
    title: "Untitled",
    season: 1,
    template: "",
    queue: []
};

let state = { ...DEFAULT_STATE };
let waitingFor = null;

async function loadState() {
    try {
        const data = await fs.readFile(DATA_FILE, 'utf8');
        const parsed = JSON.parse(data);
        state = { ...DEFAULT_STATE, ...parsed };
        if (!Array.isArray(state.queue)) state.queue = [];
    } catch (error) {
        state = { ...DEFAULT_STATE };
        await saveState();
    }
}

async function saveState() {
    try {
        await fs.writeFile(DATA_FILE, JSON.stringify(state, null, 2), 'utf8');
    } catch (error) {
        console.error("Failed to save state", error);
    }
}

function generateCaption(index) {
    const s = String(state.season).padStart(2, '0');
    const e = String(index + 1).padStart(2, '0');
    let caption = `${state.title}\nS${s}E${e}`;
    if (state.template && state.template.trim() !== "") {
        caption += `\n\n${state.template}`;
    }
    return caption;
}

bot.use(async (ctx, next) => {
    if (!ctx.from || String(ctx.from.id) !== OWNER_ID) return;
    try {
        await next();
    } catch (error) {
        console.error("Error handling update:", error);
    }
});

const sendMenu = async (ctx) => {
    waitingFor = null;
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
    waitingFor = 'title';
    await ctx.reply('Send me the new Title:');
};

const handleSetSeason = async (ctx) => {
    waitingFor = 'season';
    await ctx.reply('Send me the new Season number:');
};

const handleSetTemplate = async (ctx) => {
    waitingFor = 'template';
    await ctx.reply('Send me the new Caption Template:');
};

const handleStatus = async (ctx) => {
    const text = `📊 **Status**\n\n🎬 Title: ${state.title}\n📺 Season: ${state.season}\n📦 Queue length: ${state.queue.length} video(s)`;
    await ctx.reply(text);
};

const handleList = async (ctx) => {
    if (state.queue.length === 0) {
        return ctx.reply('The queue is empty.');
    }
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
    if (state.queue.length === 0) {
        return ctx.reply('The queue is empty. Nothing to post.');
    }
    if (!TELEGRAM_CHANNEL_ID) {
        return ctx.reply('TELEGRAM_CHANNEL_ID is not configured in environment variables.');
    }
    const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('CONFIRM POST', 'confirm_post'), Markup.button.callback('CANCEL', 'cancel')]
    ]);
    await ctx.reply(`Are you sure you want to post ${state.queue.length} video(s) to the channel?`, keyboard);
};

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
    await ctx.editMessageText('Action cancelled.');
    await sendMenu(ctx);
});

bot.action('confirm_clear', async (ctx) => {
    state.queue = [];
    await saveState();
    await ctx.editMessageText('🗑 Queue has been cleared successfully.');
});

bot.action('confirm_post', async (ctx) => {
    await ctx.editMessageText('🚀 Posting in progress...');
    let successCount = 0;

    for (let i = 0; i < state.queue.length; i++) {
        try {
            await ctx.telegram.sendVideo(TELEGRAM_CHANNEL_ID, state.queue[i], {
                caption: generateCaption(i)
            });
            successCount++;
        } catch (error) {
            await ctx.reply(`❌ Failed to post video index ${i}. Error: ${error.message}`);
            break; 
        }
    }

    if (successCount === state.queue.length && state.queue.length > 0) {
        state.queue = [];
        await saveState();
        await ctx.reply(`✅ Successfully posted ${successCount} video(s) to the channel. Queue cleared.`);
    } else if (successCount > 0) {
        state.queue = state.queue.slice(successCount);
        await saveState();
        await ctx.reply(`⚠️ Partially posted ${successCount} video(s). Remaining videos kept in queue.`);
    }
});

bot.on('video', async (ctx) => {
    const fileId = ctx.message.video.file_id;
    state.queue.push(fileId);
    await saveState();
    
    const currentIndex = state.queue.length;
    const seasonStr = String(state.season).padStart(2, '0');
    const episodeStr = String(currentIndex).padStart(2, '0');
    
    await ctx.reply(`✅ Video added to queue. Assigned: S${seasonStr}E${episodeStr}\nTotal in queue: ${state.queue.length}`);
});

bot.on('text', async (ctx, next) => {
    if (!waitingFor) return next();

    const text = ctx.message.text;

    if (waitingFor === 'title') {
        state.title = text;
        await ctx.reply(`✅ Title updated to:\n${state.title}`);
    } else if (waitingFor === 'season') {
        const parsed = parseInt(text, 10);
        if (isNaN(parsed)) {
            return ctx.reply('❌ Invalid number. Please send a valid season number:');
        }
        state.season = parsed;
        await ctx.reply(`✅ Season updated to:\n${state.season}`);
    } else if (waitingFor === 'template') {
        state.template = text;
        await ctx.reply(`✅ Template updated to:\n${state.template}`);
    }

    waitingFor = null;
    await saveState();
    await sendMenu(ctx);
});

loadState().then(() => {
    bot.launch();
    console.log('Bot is running...');
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
