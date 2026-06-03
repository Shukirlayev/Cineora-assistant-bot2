const { MongoClient } = require('mongodb');
const config = require('../config');

let collection = null;

const state = {
    workspaces: {}, // Yangi: Har bir foydalanuvchining alohida ish stoli
    saved_templates: [],
    admins: [],
    stats: { total_posts: 0, total_videos: 0 }
};

// Yangi funksiya: Adminning shaxsiy ish stolini olib beradi
function getWorkspace(userId) {
    if (!state.workspaces[userId]) {
        state.workspaces[userId] = {
            title: "Untitled",
            season: 1,
            season_info: "",
            template: "",
            queue: []
        };
    }
    return state.workspaces[userId];
}

async function loadState() {
    try {
        if (!config.MONGO_URI) return;
        const client = new MongoClient(config.MONGO_URI);
        await client.connect();
        collection = client.db('CineoraBot').collection('bot_state');
        
        const data = await collection.findOne({ _id: "main_state" });
        if (data) {
            state.workspaces = data.workspaces || {};
            state.saved_templates = Array.isArray(data.saved_templates) ? data.saved_templates : [];
            state.admins = Array.isArray(data.admins) ? data.admins : [];
            state.stats = data.stats || { total_posts: 0, total_videos: 0 };
        } else {
            await saveState();
        }
    } catch (error) { console.error("❌ MongoDB xatosi:", error); }
}

async function saveState() {
    try {
        if (!collection) return;
        await collection.updateOne({ _id: "main_state" }, { $set: state }, { upsert: true });
    } catch (error) { console.error("🔄 MongoDB yozish xatosi:", error); }
}

module.exports = { state, getWorkspace, loadState, saveState };
