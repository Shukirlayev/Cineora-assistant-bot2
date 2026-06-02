const fs = require('fs').promises;
const path = require('path');

const DATA_FILE = path.join(__dirname, 'data.json');

const DEFAULT_STATE = {
    title: "Untitled",
    season: 1,
    template: "",
    queue: []
};

let state = { ...DEFAULT_STATE };

async function loadState() {
    try {
        const data = await fs.readFile(DATA_FILE, 'utf8');
        const parsed = JSON.parse(data);
        state = { ...DEFAULT_STATE, ...parsed };
        if (!Array.isArray(state.queue)) state.queue = [];
    } catch (error) {
        state = { ...DEFAULT_STATE };
        await saveState();
    }
}

async function saveState() {
    try {
        await fs.writeFile(DATA_FILE, JSON.stringify(state, null, 2), 'utf8');
    } catch (error) {
        console.error("Ma'lumotlarni saqlashda xatolik:", error);
    }
}

function generateCaption(index) {
    const s = String(state.season).padStart(2, '0');
    const e = String(index + 1).padStart(2, '0');
    
    // Sarlavha yuklanish paytida joriy real vaqtdagi state.title dan olinadi
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
