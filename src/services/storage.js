const fs = require('fs').promises;
const path = require('path');

const DATA_FILE = path.join(__dirname, '../../data.json');

// Ob'ekt manzili buzilmasligi uchun qulflangan yagona oqim
const state = {
    title: "Untitled",
    season: 1,
    template: "",
    queue: []
};

async function loadState() {
    try {
        const data = await fs.readFile(DATA_FILE, 'utf8');
        const parsed = JSON.parse(data);
        
        state.title = parsed.title || "Untitled";
        state.season = parsed.season || 1;
        state.template = parsed.template || "";
        state.queue = Array.isArray(parsed.queue) ? parsed.queue : [];
    } catch (error) {
        await saveState();
    }
}

async function saveState() {
    try {
        await fs.writeFile(DATA_FILE, JSON.stringify(state, null, 2), 'utf8');
    } catch (error) {
        console.error("🔄 JSON ma'lumot yozishda xatolik:", error);
    }
}

module.exports = { state, loadState, saveState };
