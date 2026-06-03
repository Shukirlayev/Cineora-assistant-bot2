require('dotenv').config();

module.exports = {
    BOT_TOKEN: process.env.BOT_TOKEN,
    OWNER_ID: process.env.OWNER_ID,
    MONGO_URI: process.env.MONGO_URI,
    TELEGRAM_CHANNEL_ID: process.env.TELEGRAM_CHANNEL_ID,
    // YANGI: Render manzilingiz (oxirida slesh / bo'lmasin)
    WEB_URL: process.env.WEB_URL || 'https://sizning-loyihangiz.onrender.com' 
};
