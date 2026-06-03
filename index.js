const { Telegraf } = require('telegraf');
const http = require('http');
const config = require('./src/config');
const { loadState } = require('./src/state');
const { registerHandlers } = require('./src/handlers');

const bot = new Telegraf(config.BOT_TOKEN);

// Xavfsizlik filtri va ruxsatlar nazorati
bot.use(async (ctx, next) => {
    if (!ctx.from || String(ctx.from.id) !== config.OWNER_ID) return;
    try {
        await next();
    } catch (error) {
        console.error("Havfsizlik filtri xatosi:", error);
    }
});

registerHandlers(bot);

// Cron-job uyg'otuvchi mini HTTP server
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('OK');
});

loadState().then(() => {
    server.listen(config.PORT, () => {
        console.log(`🚀 Sog'liqni tekshirish server porti: ${config.PORT}`);
    });
    
    bot.launch().catch(err => console.error("Botni yuklashda xatolik:", err));
    console.log('🤖 Bot professional rejimda muvaffaqiyatli ishga tushdi...');
});

// Kutilmagan jiddiy xatoliklarda bot o'chib qolishini taqiqlash
process.on('uncaughtException', (err) => {
    console.error('🔥 Tizimli og'ir xatolik (Bot saqlab qolindi):', err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('🔥 Va'da bajarilmadi (Unhandled Rejection):', reason);
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
