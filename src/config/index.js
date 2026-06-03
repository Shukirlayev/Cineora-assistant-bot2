require('dotenv').config();

if (!process.env.BOT_TOKEN || !process.env.OWNER_ID) {
    console.error("❌ XAVFSIZLIK XATOSI: BOT_TOKEN yoki OWNER_ID topilmadi!");
    process.exit(1);
}

module.exports = {
    BOT_TOKEN: process.env.BOT_TOKEN,
    OWNER_ID: String(process.env.OWNER_ID),
    TELEGRAM_CHANNEL_ID: process.env.TELEGRAM_CHANNEL_ID,
    MONGO_URI: process.env.MONGO_URI,
    PORT: process.env.PORT || 3000
};
