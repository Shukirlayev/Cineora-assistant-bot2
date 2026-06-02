require('dotenv').config();
const { Telegraf } = require('telegraf');
const http = require('http');
const { loadState } = require('./state');
const { registerHandlers } = require('./handlers');

const BOT_TOKEN = process.env.BOT_TOKEN;
const OWNER_ID = String(process.env.OWNER_ID);
const PORT = process.env.PORT || 3000;

const bot = new Telegraf(BOT_TOKEN);

bot.use(async (ctx, next) => {
    if (!ctx.from || String(ctx.from.id) !== OWNER_ID) return;
    try {
        await next();
    } catch (error) {
        console.error("Xavfsizlik filtri xatosi:", error);
    }
});

registerHandlers(bot);

const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('OK');
});

loadState().then(() => {
    server.listen(PORT, () => {
        console.log(`Health check server running on port ${PORT}`);
    });
    
    bot.launch().catch(err => console.error("Bot ishga tushmadi:", err));
    console.log('Bot safely started...');
});

process.on('uncaughtException', (err) => {
    console.error('Tizimli kutilmagan xatolik:', err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection yuz berdi:', reason);
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
