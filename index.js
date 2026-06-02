require('dotenv').config();
const { Telegraf } = require('telegraf');
const http = require('http');
const { loadState } = require('./state');
const { registerHandlers } = require('./handlers');

const BOT_TOKEN = process.env.BOT_TOKEN;
const OWNER_ID = String(process.env.OWNER_ID);
const PORT = process.env.PORT || 3000;

const bot = new Telegraf(BOT_TOKEN);

// Havfsizlik filtri
bot.use(async (ctx, next) => {
    if (!ctx.from || String(ctx.from.id) !== OWNER_ID) return;
    try {
        await next();
    } catch (error) {
        console.error("Error:", error);
    }
});

// Handlerlarni ulash
registerHandlers(bot);

// Render "Live" statusi uchun mini server
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Bot is active and running!');
});

loadState().then(() => {
    server.listen(PORT, () => {
        console.log(`Health check server running on port ${PORT}`);
    });
    bot.launch();
    console.log('Bot is running safely...');
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
