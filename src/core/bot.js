const { Telegraf } = require('telegraf');
const config = require('../config');

const bot = new Telegraf(config.BOT_TOKEN);

// Shaxsiy asistent xavfsizlik filtri
bot.use(async (ctx, next) => {
    if (!ctx.from || String(ctx.from.id) !== config.OWNER_ID) return;
    try {
        await next();
    } catch (error) {
        console.error("Xavfsizlik filtri middleware xatosi:", error);
    }
});

module.exports = { bot };
