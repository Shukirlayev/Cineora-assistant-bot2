const { MongoClient } = require('mongodb');
const config = require('../config');

let collection = null;

const state = {
    title: "Untitled",
    season: 1,
    season_info: "",
    template: "", // Joriy faol shablon
    queue: [],
    saved_templates: [], // { name: "Kino", text: "..." }
    admins: [], // Yordamchilarning ID raqamlari
    stats: { total_posts: 0, total_videos: 0 } // Avtomat statistika
};

async function loadState() {
    try {
        if (!config.MONGO_URI) return;
        const client = new MongoClient(config.MONGO_URI);
        await client.connect();
        collection = client.db('CineoraBot').collection('bot_state');
        
        const data = await collection.findOne({ _id: "main_state" });
        if (data) {
            Object.assign(state, data);
            state.queue = Array.isArray(data.queue) ? data.queue : [];
            state.saved_templates = Array.isArray(data.saved_templates) ? data.saved_templates : [];
            state.admins = Array.isArray(data.admins) ? data.admins : [];
            state.stats = data.stats || { total_posts: 0, total_videos: 0 };
        } else {
            await saveState();
        }
    } catch (error) { console.error("❌ MongoDB ulanish xatosi:", error); }
}

async function saveState() {
    try {
        if (!collection) return;
        await collection.updateOne({ _id: "main_state" }, { $set: state }, { upsert: true });
    } catch (error) { console.error("🔄 MongoDB yozish xatosi:", error); }
}

module.exports = { state, loadState, saveState };
