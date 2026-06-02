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
        console.error("Havfsizlik filtri ichida xatolik:", error);
    }
});

registerHandlers(bot);

// Cron-job uchun faqat qisqa 'OK' qaytaruvchi toza server
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('OK');
});

loadState().then(() => {
    server.listen(PORT, () => {
        console.log(`Health check server running on port ${PORT}`);
    });
    
    bot.launch().catch(err => console.error("Bot ishga tushishida xato:", err));
    console.log('Bot safely started...');
});

// Kutilmagan xatoliklar tufayli bot o'chib qolmasligi uchun himoya
process.on('uncaughtException', (err) => {
    console.error('Tizimli jiddiy xatolik (Bot o\'chib qolishidan saqlandi):', err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Vada bajarilmadi (Unhandled Rejection):', reason);
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
