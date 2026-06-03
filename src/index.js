const config = require('./config');
const { bot } = require('./core/bot');
const { startServer } = require('./core/server');
const { loadState } = require('./services/storage');
const { initCommands } = require('./handlers/commands');
const { initActions } = require('./handlers/actions');
const { initMedia } = require('./handlers/media');

initCommands(bot);
initActions(bot);
initMedia(bot);

loadState().then(() => {
    startServer(config.PORT);
    
    bot.launch().catch(err => console.error('Bot ishga tushishida xatolik:', err));
    console.log('🤖 Bot professional enterprise karkasda muvaffaqiyatli ishga tushdi...');
});

process.on('uncaughtException', (err) => {
    console.error('🔥 Tizimli og\'ir xatolik (Bot saqlab qolindi):', err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('🔥 Va\'da bajarilmadi (Unhandled Rejection):', reason);
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
