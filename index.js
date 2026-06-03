const config = require('./src/config');
const { bot } = require('./src/core/bot');
const { startServer } = require('./src/core/server');
const { loadState } = require('./src/services/storage');
const { initCommands } = require('./src/handlers/commands');
const { initActions } = require('./src/handlers/actions');
const { initMedia } = require('./src/handlers/media');

// Handler qatlamlarini botga ulash
initCommands(bot);
initActions(bot);
initMedia(bot);

// Ma'lumotlarni yuklash va tizimlarni yoqish
loadState().then(() => {
    startServer(config.PORT);
    
    bot.launch().catch(err => console.error("Bot ishga tushishida xatolik:", err));
    console.log('🤖 Bot professional enterprise karkasda muvaffaqiyatli ishga tushdi...');
});

// Kutilmagan crash xatolaridan toliq himoya
process.on('uncaughtException', (err) => {
    console.error(`🔥 Tizimli og'ir xatolik (Bot saqlab qolindi):`, err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error(`🔥 Va'da bajarilmadi (Unhandled Rejection):`, reason);
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
