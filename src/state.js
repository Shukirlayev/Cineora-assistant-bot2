const fs = require('fs').promises;
const path = require('path');

const DATA_FILE = path.join(__dirname, '../data.json');

// Ob'ekt manzili o'zgarmasligi uchun const bilan qulflaymiz
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
        
        // Manzilni buzmasdan ichki qiymatlarni xavfsiz mutatsiya qilamiz
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
        console.error("🔄 Ma'lumotlarni JSON faylga yozishda xatolik:", error);
    }
}

function generateCaption(index) {
    const s = String(state.season).padStart(2, '0');
    const e = String(index + 1).padStart(2, '0');
    
    // Nomi va S01E01 qatorlari qat'iy qalin (bold) formatda chiqadi
    let caption = `<b>${state.title}</b>\n<b>S${s}E${e}</b>`;
    
    if (state.template && state.template.trim() !== "") {
        caption += `\n\n${state.template}`;
    }
    return caption;
}

module.exports = {
    state,
    loadState,
    saveState,
    generateCaption
};
