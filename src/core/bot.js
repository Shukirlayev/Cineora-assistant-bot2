const { Telegraf } = require('telegraf');
const config = require('../config');
const { state } = require('../services/storage');

const bot = new Telegraf(config.BOT_TOKEN);

// Smart RBAC (Role-Based Access Control) filtri
bot.use(async (ctx, next) => {
    if (!ctx.from) return;
    
    const userId = String(ctx.from.id);
    const isOwner = userId === config.OWNER_ID;
    const isAdmin = state.admins && state.admins.includes(userId);
    
    // Ruxsati yo'qlarni butunlay e'tiborsiz qoldirish
    if (!isOwner && !isAdmin) return;
    
    // Foydalanuvchi darajasini (Role) UI uchun saqlab qo'yamiz
    ctx.isOwner = isOwner; 
    
    try {
        await next();
    } catch (error) {
        console.error("Xavfsizlik filtri xatosi:", error);
    }
});

module.exports = { bot };
