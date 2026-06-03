const { MongoClient } = require('mongodb');
const config = require('../config');

let collection = null;

// Xotira modeli o'zgarishsiz qoladi
const state = {
    title: "Untitled",
    season: 1,
    season_info: "",
    template: "",
    queue: []
};

async function loadState() {
    try {
        if (!config.MONGO_URI) {
            console.log("⚠️ MONGO_URI topilmadi! Baza ulanmadi.");
            return;
        }
        
        // MongoDB ga ulanish
        const client = new MongoClient(config.MONGO_URI);
        await client.connect();
        const db = client.db('CineoraBot');
        collection = db.collection('bot_state');

        // Bazadan oxirgi holatni izlash
        const data = await collection.findOne({ _id: "main_state" });
        
        if (data) {
            state.title = data.title || "Untitled";
            state.season = data.season || 1;
            state.season_info = data.season_info || "";
            state.template = data.template || "";
            state.queue = Array.isArray(data.queue) ? data.queue : [];
            console.log("✅ MongoDB muvaffaqiyatli ulandi va ma'lumotlar yuklandi!");
        } else {
            // Agar baza bo'sh bo'lsa, boshlang'ich holatni yozish
            await saveState();
        }
    } catch (error) {
        console.error("❌ MongoDB ga ulanishda jiddiy xato:", error);
    }
}

async function saveState() {
    try {
        if (!collection) return;
        
        // Bazani xavfsiz yangilash (bor bo'lsa yangilaydi, yo'q bo'lsa yaratadi)
        await collection.updateOne(
            { _id: "main_state" },
            { $set: state },
            { upsert: true }
        );
    } catch (error) {
        console.error("🔄 MongoDB ga ma'lumot yozishda xatolik:", error);
    }
}

module.exports = { state, loadState, saveState };
